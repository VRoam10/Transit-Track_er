import { PrismaClient } from "@prisma/client";
import { NextFunction, Request, Response, Router } from "express";
import { body, validationResult } from "express-validator";
import util from "util";
import { authenticateToken } from "../../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

const validateConnector = [
    body('name')
        .isString()
        .notEmpty()
        .withMessage('Each connector item must have a valid name'),

    body('apiUrl')
        .isString()
        .notEmpty()
        .withMessage('Each connector item must have a valid API URL'),
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
        const connector = await prisma.connector.findMany({
            where: {
                userId: req.user.id,
            },
        });
        res.status(200).json(connector);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/:id", authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const connector = await prisma.connector.findUnique({
            where: {
                id: req.params.id,
                userId: req.user.id,
            },
        });
        res.status(200).json(connector);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.post("/", validateConnector, handleValidationErrors, authenticateToken, async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const newConnector = await prisma.connector.create({
            data: {
                ...req.body,
                userId: req.user.id,
            },
        });
        res.status(201).json(newConnector);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.put("/:id", validateConnector, handleValidationErrors, authenticateToken, async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const updatedConnector = await prisma.connector.update({
            where: {
                id: req.params.id,
                userId: req.user.id,
            },
            data: {
                ...req.body,
            },
        });
        res.status(200).json(updatedConnector);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.delete("/:id", authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const deletedConnector = await prisma.connector.delete({
            where: {
                id: req.params.id,
                userId: req.user.id,
            },
        });
        res.status(200).json(deletedConnector);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;