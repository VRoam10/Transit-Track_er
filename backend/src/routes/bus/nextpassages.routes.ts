import axios from "axios";
import { Router } from "express";

const router = Router();

router.get("/:id", async (req, res) => {
  try {
    const [idLigne, direction, idStop] = req.params.id.split("-");
    axios.get(`https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-bus-circulation-passages-tr/records?order_by=arrivee&limit=20&refine=idarret%3A${idStop}&refine=idligne%3A%22${idLigne}%22`).then((response) => {
      let passages = response.data.results.map((passage: any) => ({
        id: req.params.id,
        lineId: passage.idligne,
        name: passage.nomarret,
        direction: passage.sens,
        nextTrain: passage.arrivee,
        coordonnees: passage.coordonnees,
        extraction: passage.heureextraction,
      }));
      if (direction != passages[0]?.direction) {
        res.json({
          total_count: 0,
          data: null
        });
        return;
      }

      res.json({
        total_count: response.data.total_count > 0 ? 1 : 0,
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
