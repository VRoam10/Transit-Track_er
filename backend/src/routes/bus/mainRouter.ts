import { Router } from "express";
import directionsRoutes from "./directions.routes";
import linesRoutes from "./lines.routes";
import nextPassagesRoutes from "./nextpassages.routes";
import stopsRoutes from "./stops.routes";

const mainRouter = Router();

mainRouter.use("/directions", directionsRoutes);
mainRouter.use("/lines", linesRoutes);
mainRouter.use("/nextpassages", nextPassagesRoutes);
mainRouter.use("/stops", stopsRoutes);

export default mainRouter;
