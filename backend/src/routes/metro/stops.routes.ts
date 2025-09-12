import { Router } from "express";

const router = Router();

router.get("/", async (req, res) => {
  try {
    // Fetch stops logic here
    res.json({
      id: "1001-1-5431",
      name: "Pontchaillou",
      direction: "1",
      order: 1,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
