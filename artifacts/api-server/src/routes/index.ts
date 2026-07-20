import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adminRouter from "./admin";
import mobileRouter from "./mobile";
import messagesRouter from "./messages";
import statsRouter from "./stats";
import studentsRouter from "./students";
import teachersRouter from "./teachers";
import parentsRouter from "./parents";
import subjectsRouter from "./subjects";
import coursesRouter from "./courses";
import reviewsRouter from "./reviews";
import livestreamsRouter from "./livestreams";
import notificationsRouter from "./notifications";
import bannersRouter from "./banners";
import lessonsRouter from "./lessons";

const router: IRouter = Router();

router.use(healthRouter);
router.use(adminRouter);
router.use(mobileRouter);
router.use(messagesRouter);
router.use(statsRouter);
router.use(studentsRouter);
router.use(teachersRouter);
router.use(parentsRouter);
router.use(subjectsRouter);
router.use(coursesRouter);
router.use(reviewsRouter);
router.use(livestreamsRouter);
router.use(notificationsRouter);
router.use(bannersRouter);
router.use(lessonsRouter);

export default router;
