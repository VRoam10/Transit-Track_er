import { Router } from "express";

const router = Router();

router.get("/", async (req, res) => {
  try {
    // Fetch directions logic here
    res.json({ direction: 1, lastStation: "La Poterie" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
