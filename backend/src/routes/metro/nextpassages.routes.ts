import axios from "axios";
import { Router } from "express";

const router = Router();

router.get("/:idStop", async (req, res) => {
  try {
    axios.get(`https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-metro-circulation-deux-prochains-passages-tr/records?order_by=arriveefirsttrain&limit=20&select=idjdd%2Cidligne%2Cnomarret%2Csens%2Carriveefirsttrain%2Ccoordonnees%2Cheureextraction&refine=idjdd%3A${req.params.idStop}`).then((response) => {
      let passages = response.data.results.map((passage: any) => ({
        id: passage.idjdd,
        lineId: passage.idligne,
        name: passage.nomarret,
        direction: passage.sens,
        nextTrain: passage.arriveefirsttrain,
        coordonnees: passage.coordonnees,
        extraction: passage.heureextraction,
      }));
      res.json({
        total_count: 1,
        data: passages[0]
      });
    }).catch((error) => {
      console.error("Error fetching next passages from external API:", error);
      throw error;
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
