import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { NextFunction, Request, Response, Router } from "express";
import { check, validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import util from "util";
import { authenticateToken } from "../middleware/auth";
import { sendNotification } from "../services/firebase.services";

const router = Router();
const prisma = new PrismaClient();

const validation = [
  check("name")
    .exists()
    .withMessage("name is required")
    .isLength({ min: 3 })
    .withMessage("wrong name length"),
  check("email")
    .exists()
    .withMessage("email is required")
    .isEmail()
    .withMessage("email not valid")
    .custom(async (value) => {
      const user = await prisma.user.findUnique({ where: { email: value } });
      if (user) {
        throw new Error("email already in use");
      }
    })
    .withMessage("email already in use"),
  check("password").exists().withMessage("password is required"),
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

router.get("/", authenticateToken, async (_req, res) => {
  const users = await prisma.user.findMany();
  res.json({ users });
});

router.post(
  "/",
  validation,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    const { name, email, password } = req.body;
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });
    res.status(201).json({ user: user.id });
  }
);

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  try {
    const match = await bcrypt.compare(password, user.password);
    if (match) {
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET as string,
        {
          expiresIn: (process.env.JWT_EXPIRES_IN ||
            "1h") as jwt.SignOptions["expiresIn"],
        }
      );
      res.status(200).json({ message: "Login successful.", token: token });
    } else {
      res.status(401).json({ error: "Invalid username or password." });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal server error." });
  }
});

router.post("/register-token", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = req.body.token;
    await prisma.user.update({
      where: { id: req.user.id },
      data: { token: token },
    });
    res.status(200).send({ message: "Token registered successfully." });
  } catch (error) {
    res.status(500).json({ error: "Internal server error." });
  }
});

router.get("/me", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    sendNotification(req.user.token, "Test", "This is a test notification");
    res.json({ id: req.user.id, name: req.user.name, email: req.user.email });
  } catch (error) {
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
