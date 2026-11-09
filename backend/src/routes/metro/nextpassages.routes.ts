import axios from "axios";
import { Request, Response, Router } from "express";

const router = Router();

router.get("/:idStop", async (req: Request<{ idStop: string }>, res: Response) => {
  try {
    const response = await axios.get(`https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-metro-circulation-deux-prochains-passages-tr/records?order_by=arriveefirsttrain&limit=20&select=idjdd%2Cidligne%2Cnomarret%2Csens%2Carriveefirsttrain%2Ccoordonnees%2Cheureextraction&refine=idjdd%3A${req.params.idStop}`);
    const passages = response.data.results.map((passage: any) => ({
      id: passage.idjdd,
      lineId: passage.idligne,
      name: passage.nomarret,
      direction: passage.sens,
      nextTrain: passage.arriveefirsttrain,
      coordonnees: passage.coordonnees,
      extraction: passage.heureextraction,
    }));
    res.json({
      total_count: response.data.total_count ? 1 : 0,
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
