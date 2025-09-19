import { PrismaClient } from "@prisma/client";
import { Router } from "express";
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

router.get("/:id", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const timetable = await prisma.savedTimetable.findUnique({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!timetable) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json(timetable);
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

    const { timetable } = req.body;

    const isValid = Array.isArray(timetable) && timetable.every(item =>
      item.cron && item.api && item.id
    );

    if (!isValid) {
      return res.status(400).json({ error: "Invalid timetable format" });
    }

    const newTimetable = await prisma.savedTimetable.create({
      data: {
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

router.put("/:id", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { timetable } = req.body;

    const isValid = Array.isArray(timetable) && timetable.every(item =>
      item.cron && item.api && item.id
    );

    if (!isValid) {
      return res.status(400).json({ error: "Invalid timetable format" });
    }

    const updatedTimetable = await prisma.savedTimetable.update({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
      data: {
        timetable,
      },
    });

    res.json(updatedTimetable);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const deletedTimetable = await prisma.savedTimetable.delete({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    res.json(deletedTimetable);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
