import axios from "axios";
import { Request, Response, Router } from "express";

const router = Router();

router.get("/:idLigne/:sens", async (req: Request<{ idLigne: string, sens: string }, any, any, { pages?: string }>, res: Response) => {
  try {
    const page = parseInt(req.query.pages ?? "0", 10);
    const offset = Number.isNaN(page) ? 0 : page * 50;
    let direction: any;

    getDirection(req.params.idLigne).then((directionData) => {
      direction = directionData.data.find((dir: any) => dir.id == req.params.sens);
      if (!direction) {
        return res.status(404).json({ error: "Direction not found" });
      }

      axios.get(`https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-metro-topologie-dessertes-td/records?order_by=ordre&select=nomarret%2Cidarret%2Cordre&limit=50&refine=idparcours%3A%22${direction.parcoursId}%22&offset=${offset}`).then((response) => {
        let stops = response.data.results.map((stop: any) => ({
          id: req.params.idLigne + '-' + direction.id + '-' + stop.idarret,
          name: stop.nomarret,
          direction: direction.id,
          order: stop.ordre
        }));
        res.json({
          total_count: response.data.total_count,
          data: stops
        });
      }).catch((error) => {
        console.error("Error fetching stops from external API:", error);
        throw error;
      });
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

function getDirection(idLigne: string) {
  return axios.get(`https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-metro-topologie-parcours-td/records?select=sens%2Cnomarretarrivee%2Cid&where=idligne%3D%22${idLigne}%22&limit=20&refine=type%3A%22Principal%22`).then((response) => {
    let directions = response.data.results.map((direction: any) => ({
      id: direction.sens,
      name: direction.nomarretarrivee,
      parcoursId: direction.id,
    }));
    return {
      total_count: response.data.total_count,
      data: directions
    };
  }).catch((error) => {
    console.error("Error fetching directions from external API:", error);
    throw error;
  });
}

export default router;
