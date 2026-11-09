import axios from "axios";
import { Request, Response, Router } from "express";

const router = Router();

router.get("/:idLigne", async (req: Request<{ idLigne: string }>, res: Response) => {
  try {
    const response = await axios.get(`https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-metro-topologie-parcours-td/records?select=sens%2Cnomarretarrivee%2Cid&where=idligne%3D%22${req.params.idLigne}%22&limit=20&refine=type%3A%22Principal%22`);
    const directions = response.data.results.map((direction: any) => ({
      id: direction.sens,
      name: direction.nomarretarrivee,
      parcoursId: direction.id,
    }));
    res.json({
      total_count: response.data.total_count,
      data: directions
    });
  } catch (error) {
    upstreamError(res, "directions", error);
  }
});

function upstreamError(res: Response, what: string, error: unknown) {
  console.error(`Error fetching ${what} from external API:`, error);
  res.status(502).json({ error: `Failed to fetch ${what} from the transit data provider` });
}

export default router;
