import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ users: [{ name: "Timmy" }] });
});

export default router;
