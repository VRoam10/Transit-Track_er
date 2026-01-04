import { Router } from "express";
import complianceRoutes from "./compliance.routes";

const mainRouter = Router();

mainRouter.use("/compliance", complianceRoutes);
export default mainRouter;
