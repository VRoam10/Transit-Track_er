import axios from "axios";
import { Request, Response, Router } from "express";

const router = Router();

router.get("/:idLigne", async (req: Request<{ idLigne: string }, any, any, { pages?: string }>, res: Response) => {
  try {
    const page = parseInt(req.query.pages ?? "0", 10);
    const offset = Number.isNaN(page) ? 0 : page * 50;

    axios.get(`https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-bus-circulation-passages-tr/records?group_by=idligne%2Cnomcourtligne%2Cidarret%2Csens%2Cnomarret&limit=50&refine=idligne%3A%22${req.params.idLigne}%22&offset=${offset}`).then((response) => {
      let stops = response.data.results.map((stop: any) => ({
        id: stop.idarret,
        name: stop.nomarret,
        direction: stop.sens,
      }));
      res.json(stops);
    }).catch((error) => {
      console.error("Error fetching stops from external API:", error);
      throw error;
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
