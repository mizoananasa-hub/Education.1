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

export default router;
