import { Router } from "express";
import complianceRoutes from "./compliance.routes";
import connectorRoutes from "./connector.routes";
import { createConnectorResourceRouter } from "./resource.routes";

const mainRouter = Router();

mainRouter.use("/compliance", complianceRoutes);
mainRouter.use("/:connectorId", createConnectorResourceRouter());
mainRouter.use("/", connectorRoutes);
export default mainRouter;
