import { Router } from "express";

const router = Router();

router.get("/direction", async (req, res) => {
    const response = {
        total_count: "Int",
        data: [
            {
                id: "Int",
                name: "String",
                parcoursId: "String",
            }
        ]
    }
    res.status(200).json(response);
});

router.get("/line", async (req, res) => {
    const response = {
        total_count: "Int",
        data: [
            {
                id: "String",
                name: "String",
                color: "String",
            }
        ]
    }
    res.status(200).json(response);
});

router.get("/nxpassage", async (req, res) => {
    const response = {
        total_count: "Int",
        data: [
            {
                id: "String",
                lineId: "String?",
                name: "String",
                direction: "Int",
                nextTrain: "Datetime",
                coordonnees: {
                    lat: "Float?",
                    lon: "Float?",
                },
                extraction: "Datetime?",
            }
        ]
    }
    res.status(200).json(response);
});

router.get("/stop", async (req, res) => {
    const response = {
        total_count: "Int",
        data: [
            {
                id: "String",
                name: "String",
                direction: "Int",
                order: "Int",
            }
        ]
    }
    res.status(200).json(response);
});

export default router;