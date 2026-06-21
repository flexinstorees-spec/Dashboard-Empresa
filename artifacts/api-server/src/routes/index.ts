import { Router, type IRouter } from "express";
import healthRouter from "./health";
import overviewRouter from "./overview";
import performanceRouter from "./performance";
import offersRouter from "./offers";
import cashflowRouter from "./cashflow";
import syncRouter from "./sync";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/overview", overviewRouter);
router.use("/performance", performanceRouter);
router.use("/offers", offersRouter);
router.use("/cashflow", cashflowRouter);
router.use("/sync", syncRouter);

export default router;
