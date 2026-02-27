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
                nextPassage: true,
            },
        });
        if (connector?.nextPassage) {
            res.status(200).json(connector?.nextPassage);
        } else {
            res.status(404).json({ error: "Next passages not found for this connector" });
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
        const newNextPassage = await prisma.nextPassage.create({
            data: {
                ...req.body,
                connector: { connect: { id: req.params.connectorId } },
            },
        });
        res.status(201).json(newNextPassage);
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
        const updatedNextPassage = await prisma.nextPassage.update({
            where: {
                connectorId: req.params.connectorId,
            },
            data: {
                ...req.body,
            },
        });
        res.status(200).json(updatedNextPassage);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.patch("/", [
    body('name').optional().isString().notEmpty().withMessage('Name must be a valid string'),
    body('apiUrl').optional().isString().notEmpty().withMessage('API URL must be a valid string'),
    body('transformation').optional().isArray().withMessage('Transformation must be an array'),
    body('params').optional().isArray().withMessage('Params must be an array of strings'),
], handleValidationErrors, authenticateToken, async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { name, apiUrl, transformation, params } = req.body;
        const updateData: Record<string, any> = {};
        if (name !== undefined) updateData.name = name;
        if (apiUrl !== undefined) updateData.apiUrl = apiUrl;
        if (transformation !== undefined) updateData.transformation = transformation;
        if (params !== undefined) updateData.params = params;

        const nextPassage = await prisma.nextPassage.upsert({
            where: { connectorId: req.params.connectorId },
            update: updateData,
            create: {
                name: updateData.name ?? '',
                apiUrl: updateData.apiUrl ?? '',
                transformation: updateData.transformation ?? [],
                params: updateData.params ?? [],
                connector: { connect: { id: req.params.connectorId } },
            },
        });
        res.status(200).json(nextPassage);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.delete("/", authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const deletedNextPassage = await prisma.nextPassage.delete({
            where: {
                connectorId: req.params.connectorId,
            },
        });
        res.status(200).json(deletedNextPassage);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;