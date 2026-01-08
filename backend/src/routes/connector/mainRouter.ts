import { Router } from "express";
import complianceRoutes from "./compliance.routes";
import connectorRoutes from "./connector.routes";

const mainRouter = Router();

mainRouter.use("/compliance", complianceRoutes);
mainRouter.use("/", connectorRoutes);
export default mainRouter;
