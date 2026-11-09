import axios from "axios";
import { Request, Response, Router } from "express";

const router = Router();

router.get("/:id", async (req: Request<{ id: string }>, res: Response) => {
  const [idLigne, direction, idStop] = req.params.id.split("-");

  try {
    const response = await axios.get(`https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-bus-circulation-passages-tr/records?order_by=arrivee&limit=20&refine=idarret%3A${idStop}&refine=idligne%3A%22${idLigne}%22`);
    const passages = response.data.results.map((passage: any) => ({
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
  } catch (error) {
    upstreamError(res, "next passages", error);
  }
});

function upstreamError(res: Response, what: string, error: unknown) {
  console.error(`Error fetching ${what} from external API:`, error);
  res.status(502).json({ error: `Failed to fetch ${what} from the transit data provider` });
}

export default router;
