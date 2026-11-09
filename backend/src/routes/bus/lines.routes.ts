import axios from "axios";
import { Request, Response, Router } from "express";

const router = Router();

router.get("/", async (req: Request<{}, any, any, { pages?: string }>, res: Response) => {
  const page = parseInt(req.query.pages ?? "0", 10);
  const offset = Number.isNaN(page) ? 0 : page * 50;

  try {
    const response = await axios.get(`https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-bus-topologie-lignes-td/records?select=id%2Cnomcourt%2Ccouleurligne&order_by=id&limit=50&offset=${offset}`);
    const lines = response.data.results.map((line: any) => ({
      id: line.id,
      name: line.nomcourt,
      color: line.couleurligne,
    }));
    res.json({
      total_count: response.data.total_count,
      data: lines
    });
  } catch (error) {
    upstreamError(res, "lines", error);
  }
});

function upstreamError(res: Response, what: string, error: unknown) {
  console.error(`Error fetching ${what} from external API:`, error);
  res.status(502).json({ error: `Failed to fetch ${what} from the transit data provider` });
}

export default router;
