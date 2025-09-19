import { PrismaClient } from "@prisma/client";
import { NextFunction, Request, Response, Router } from "express";
import { body, validationResult } from "express-validator";
import util from "util";
import { authenticateToken } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

const validateSchedule = [
  body('timetable')
    .isObject()
    .withMessage('timetable must be an object'),

  body('timetable.cron')
    .isString()
    .notEmpty()
    .withMessage('Each timetable item must have a valid cron string'),

  body('timetable.api')
    .isString()
    .notEmpty()
    .withMessage('Each timetable item must have a valid API identifier'),

  body('timetable.id')
    .notEmpty()
    .withMessage('Each timetable item must have an ID'),

  body('timetable.mode')
    .isString()
    .notEmpty()
    .withMessage('Each timetable item must have a valid transport mode'),
];

function handleValidationErrors(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(util.inspect(errors.array()));
    return res.status(422).json({ errors: errors.array() });
  }

  next();
}

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

router.post("/", validateSchedule, handleValidationErrors, authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { timetable } = req.body;

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

router.put("/:id", validateSchedule, handleValidationErrors, authenticateToken, async (req: Request, res: Response) => {
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
