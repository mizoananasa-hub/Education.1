import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import filesRouter from "./files";
import studentsRouter from "./students";
import ratingsRouter from "./ratings";
import notebooksRouter from "./notebooks";
import notesRouter from "./notes";
import noteFilesRouter from "./note-files";
import aiRouter from "./ai";
import homeworkRouter from "./homework";
import notificationsRouter from "./notifications";
import adminRouter from "./admin";
import debugRouter from "./debug";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(filesRouter);
router.use(studentsRouter);
router.use(ratingsRouter);
router.use(notebooksRouter);
router.use(notesRouter);
router.use(noteFilesRouter);
router.use(aiRouter);
router.use(homeworkRouter);
router.use(notificationsRouter);
router.use(adminRouter);
router.use(debugRouter);

export default router;
