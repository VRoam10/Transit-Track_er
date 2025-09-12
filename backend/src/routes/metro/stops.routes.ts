import axios from "axios";
import { Router } from "express";

const router = Router();

router.get("/:idLigne", async (req, res) => {
  try {
    // Fetch stops logic here
    axios.get(`https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-metro-circulation-deux-prochains-passages-tr/records?select=nomarret%2Cidjdd%2Csens&limit=50&refine=idligne%3A%22${req.params.idLigne}%22`).then((response) => {
      let stops = response.data.results.map((stop: any) => ({
        id: stop.idjdd,
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
