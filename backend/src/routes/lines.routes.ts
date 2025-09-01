import { Router } from "express";

const router = Router();

router.get("/", async (req, res) => {
  try {
    // Fetch lines logic here
    res.json({ id: "1001", name: "a", color: "blue" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
