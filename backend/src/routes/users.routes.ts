import { PrismaClient } from "@prisma/client";
import { Router } from "express";

const router = Router();
const prisma = new PrismaClient();

router.get("/", async (_req, res) => {
  const users = await prisma.user.findMany();
  res.json({ users });
});

router.post("/", async (req, res) => {
  const { name, email } = req.body;
  const user = await prisma.user.create({
    data: { name, email },
  });
  res.status(201).json({ user });
});

export default router;
