import { PrismaClient } from "@prisma/client";
import { json, Router } from "express";
import { authenticateToken } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

router.get("/", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const timetables = await prisma.savedTimetable.findMany({
      where: {
        userId: req.user.id,
      },
    });
    res.json(timetables);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id, timetable } = req.body;

    const newTimetable = await prisma.savedTimetable.create({
      data: {
        id,
        timetable,
        userId: req.user.id,
      },
    });

    res.status(201).json(newTimetable);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
