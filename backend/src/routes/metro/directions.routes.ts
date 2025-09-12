import axios from "axios";
import { Router } from "express";

const router = Router();

router.get("/:idLigne", async (req, res) => {
  try {
    axios.get(`https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-metro-topologie-parcours-td/records?select=sens%2Cnomarretarrivee&where=idligne%3D%22${req.params.idLigne}%22&limit=20&refine=type%3A%22Principal%22`).then((response) => {
      let directions = response.data.results.map((direction: any) => ({
        id: direction.sens,
        name: direction.nomarretarrivee,
      }));
      res.json(directions);
    }).catch((error) => {
      console.error("Error fetching directions from external API:", error);
      throw error;
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
