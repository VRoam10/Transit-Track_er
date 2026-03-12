import { Router } from "express";
import complianceRoutes from "./compliance.routes";
import connectorRoutes from "./connector.routes";
import directionConnectorRoutes from "./direction.routes";
import lineConnectorRoutes from "./line.routes";
import nxpassageConnectorRoutes from "./nextpassage.routes";
import stopConnectorRoutes from "./stop.routes";
import lineProxyRoutes from "./proxy/line.proxy.routes";
import directionProxyRoutes from "./proxy/direction.proxy.routes";
import stopProxyRoutes from "./proxy/stop.proxy.routes";
import nxpassageProxyRoutes from "./proxy/nxpassage.proxy.routes";

const mainRouter = Router();

mainRouter.use("/compliance", complianceRoutes);
mainRouter.use("/:connectorId/line/proxy", lineProxyRoutes);
mainRouter.use("/:connectorId/line", lineConnectorRoutes);
mainRouter.use("/:connectorId/stop/proxy", stopProxyRoutes);
mainRouter.use("/:connectorId/stop", stopConnectorRoutes);
mainRouter.use("/:connectorId/nxpassage/proxy", nxpassageProxyRoutes);
mainRouter.use("/:connectorId/nxpassage", nxpassageConnectorRoutes);
mainRouter.use("/:connectorId/direction/proxy", directionProxyRoutes);
mainRouter.use("/:connectorId/direction", directionConnectorRoutes);
mainRouter.use("/", connectorRoutes);
export default mainRouter;
