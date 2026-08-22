import { Router } from "express";
import healthRouter from "./health";
import runsRouter from "./runs";
import dashboardRouter from "./dashboard";

const router = Router();

router.use(healthRouter);
router.use(runsRouter);
router.use(dashboardRouter);

export default router;