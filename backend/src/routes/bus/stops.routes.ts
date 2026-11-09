import axios from "axios";
import { Request, Response, Router } from "express";

const router = Router();

router.get("/:idLigne/:sens", async (req: Request<{ idLigne: string, sens: string }, any, any, { pages?: string }>, res: Response) => {
  const page = parseInt(req.query.pages ?? "0", 10);
  const offset = Number.isNaN(page) ? 0 : page * 50;

  try {
    const directions = await getDirections(req.params.idLigne);
    const direction = directions.find((dir: any) => dir.id == req.params.sens);
    if (!direction) {
      return res.status(404).json({ error: "Direction not found" });
    }

    const response = await axios.get(`https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-bus-topologie-dessertes-td/records?order_by=ordre&select=idligne%2Cnomcourtligne%2Cidarret%2Cnomarret%2Cordre&limit=50&refine=idparcours%3A%22${direction.parcoursId}%22&offset=${offset}`);
    const stops = response.data.results.map((stop: any) => ({
      id: req.params.idLigne + '-' + direction.id + '-' + stop.idarret,
      name: stop.nomarret,
      direction: direction.id,
      order: stop.ordre
    }));
    res.json({
      total_count: response.data.total_count,
      data: stops
    });
  } catch (error) {
    upstreamError(res, "stops", error);
  }
});

async function getDirections(idLigne: string) {
  const response = await axios.get(`https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-bus-topologie-parcours-td/records?select=sens%2Cnomarretarrivee%2Cid&where=idligne%3D%22${idLigne}%22&limit=20&refine=type%3A%22Principal%22`);
  return response.data.results.map((direction: any) => ({
    id: direction.sens,
    name: direction.nomarretarrivee,
    parcoursId: direction.id,
  }));
}

function upstreamError(res: Response, what: string, error: unknown) {
  console.error(`Error fetching ${what} from external API:`, error);
  res.status(502).json({ error: `Failed to fetch ${what} from the transit data provider` });
}

export default router;
