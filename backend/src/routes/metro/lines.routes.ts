import axios from "axios";
import { Router } from "express";

const router = Router();

router.get("/", async (req, res) => {
  try {
    // Fetch lines logic here
    axios.get("https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-metro-topologie-lignes-td/records?select=id%2Cnomcourt%2Ccouleurligne&order_by=id&limit=20").then((response) => {
      let lines = response.data.results.map((line: any) => ({
        id: line.id,
        name: line.nomcourt,
        color: line.couleurligne,
      }));
      res.json(lines);
    }).catch((error) => {
      console.error("Error fetching lines from external API:", error);
      throw error;
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
