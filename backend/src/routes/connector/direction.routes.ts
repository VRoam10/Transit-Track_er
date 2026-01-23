import { PrismaClient } from "@prisma/client";
import { NextFunction, Request, Response, Router } from "express";
import { body, validationResult } from "express-validator";
import util from "util";
import { authenticateToken } from "../../middleware/auth";

const router = Router({ mergeParams: true });
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

    body('transformation')
        .isArray()
        .exists()
        .withMessage('Each connector item must have a valid transformation object')
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

        const connector = await prisma.connector.findUnique({
            where: {
                id: req.params.connectorId,
                userId: req.user.id,
            },
            include: {
                direction: true,
            },
        });
        if (connector?.direction) {
            res.status(200).json(connector?.direction);
        } else {
            res.status(404).json({ error: "Directions not found for this connector" });
        }
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
        const newDirection = await prisma.direction.create({
            data: {
                ...req.body,
                connector: { connect: { id: req.params.connectorId } },
            },
        });
        res.status(201).json(newDirection);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.put("/", validateConnector, handleValidationErrors, authenticateToken, async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const updatedDirection = await prisma.direction.update({
            where: {
                connectorId: req.params.connectorId,
            },
            data: {
                ...req.body,
            },
        });
        res.status(200).json(updatedDirection);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.delete("/", authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const deletedDirection = await prisma.direction.delete({
            where: {
                connectorId: req.params.connectorId,
            },
        });
        res.status(200).json(deletedDirection);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;