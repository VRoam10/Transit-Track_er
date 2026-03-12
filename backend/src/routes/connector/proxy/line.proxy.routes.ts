import axios from "axios";
import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { applyTransformation, buildUrl, missingParams } from "../../../utils/transform";

const router = Router({ mergeParams: true });
const prisma = new PrismaClient();

router.get("/", async (req: Request, res: Response) => {
    try {
        const connector = await prisma.connector.findUnique({
            where: { id: req.params.connectorId },
            include: { line: true },
        });

        if (!connector?.line) {
            return res.status(404).json({ error: "Line config not found for this connector" });
        }

        const { apiUrl, transformation, params } = connector.line;

        const offset = req.query.offset as string;
        if (offset === undefined || offset === '') {
            return res.status(400).json({ error: 'Missing required param: offset' });
        }

        const missing = missingParams(params, req.query as Record<string, any>);
        if (missing.length > 0) {
            return res.status(400).json({ error: `Missing required params: ${missing.join(', ')}` });
        }

        const url = buildUrl(apiUrl, [...params, 'offset'], req.query as Record<string, any>);

        const response = await axios.get(url);
        const transformed = applyTransformation(response.data, transformation as any[]);

        res.json(transformed);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
