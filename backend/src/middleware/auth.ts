import { PrismaClient } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1]; // Bearer <token>

  if (!token) return res.sendStatus(401);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: number;
    };

    // Fetch full user from DB
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) return res.sendStatus(401);

    req.user = user;
    next();
  } catch (err) {
    return res.sendStatus(403);
  }
};
