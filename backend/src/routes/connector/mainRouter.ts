import { Router } from "express";
import complianceRoutes from "./compliance.routes";
import connectorRoutes from "./connector.routes";
import directionConnectorRoutes from "./direction.routes";
import lineConnectorRoutes from "./line.routes";
import nxpassageConnectorRoutes from "./nextpassage.routes";
import stopConnectorRoutes from "./stop.routes";

const mainRouter = Router();

mainRouter.use("/compliance", complianceRoutes);
mainRouter.use("/:connectorId/line", lineConnectorRoutes);
mainRouter.use("/:connectorId/stop", stopConnectorRoutes);
mainRouter.use("/:connectorId/nextpassage", nxpassageConnectorRoutes);
mainRouter.use("/:connectorId/direction", directionConnectorRoutes);
mainRouter.use("/", connectorRoutes);
export default mainRouter;
