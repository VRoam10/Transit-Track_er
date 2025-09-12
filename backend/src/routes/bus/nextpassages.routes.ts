import axios from "axios";
import { Router } from "express";

const router = Router();

router.get("/:idLigne/:idStop", async (req, res) => {
  try {
    // Fetch next passages logic here
    axios.get(`https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-bus-circulation-passages-tr/records?limit=20&refine=idarret%3A${req.params.idStop}&refine=idligne%3A%22${req.params.idLigne}%22`).then((response) => {
      let passages = response.data.results.map((passage: any) => ({
        id: passage.idjdd,
        lineId: passage.idligne,
        name: passage.nomarret,
        direction: passage.sens,
        nextTrain: passage.arriveefirsttrain,
        coordonnees: passage.coordonnees,
        extraction: passage.heureextraction,
      }));
      res.json(passages);
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
