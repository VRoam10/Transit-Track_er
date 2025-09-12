import { Router } from "express";

const router = Router();

router.get("/", async (req, res) => {
  try {
    // Fetch next passages logic here
    res.json({
      id: "1001-1-5431",
      name: "Pontchaillou",
      direction: "1",
      idLine: "1001",
      nextTrain: "10:30",
      coordonnes: { lat: 48.123456, lon: -1.234567 },
      extractionTime: "2023-10-10T10:00:00Z",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
