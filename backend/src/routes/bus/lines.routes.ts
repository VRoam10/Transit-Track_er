import axios from "axios";
import { Router, Request, Response } from "express";

const router = Router();

router.get("/", async (req: Request<{}, any, any, { pages?: string }>, res: Response) => {
  try {
    const page = parseInt(req.query.pages ?? "0", 10);
    const offset = Number.isNaN(page) ? 0 : page * 50;
    
    axios.get(`https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-bus-topologie-lignes-td/records?select=id%2Cnomcourt%2Ccouleurligne&order_by=id&limit=50&offset=${offset}`).then((response) => {
      let lines = response.data.results.map((line: any) => ({
        id: line.id,
        name: line.nomcourt,
        color: line.couleurligne,
      }));
      res.json({
        total_count: response.data.total_count,
        data: lines
      });
    }).catch((error) => {
      console.error("Error fetching lines from external API:", error);
      throw error;
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
