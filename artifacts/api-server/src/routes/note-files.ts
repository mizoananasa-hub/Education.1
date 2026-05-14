import { Router } from "express";
import { db, noteFilesTable, notebooksTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireStudent } from "../middlewares/auth.js";
import { noteFileUpload } from "../lib/upload.js";
import type { Request, Response } from "express";
import type { JwtPayload } from "../middlewares/auth.js";
import fs from "fs";
import path from "path";

const router = Router();
type AuthReq = Request & { user: JwtPayload };

async function ownsNotebook(studentId: number, notebookId: number): Promise<boolean> {
  const [nb] = await db.select().from(notebooksTable).where(
    and(eq(notebooksTable.id, notebookId), eq(notebooksTable.studentId, studentId))
  ).limit(1);
  return !!nb;
}

router.get("/note-files", requireStudent, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthReq).user;
  const rawId = req.query.notebookId;
  if (!rawId) {
    res.status(400).json({ error: "notebookId query param required" });
    return;
  }
  const notebookId = parseInt(rawId as string, 10);

  if (!await ownsNotebook(user.id!, notebookId)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const rows = await db.select().from(noteFilesTable).where(eq(noteFilesTable.notebookId, notebookId));
  res.json(rows);
});

router.post("/note-files", requireStudent, noteFileUpload.single("file"), async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthReq).user;
  const file = req.file;
  const rawId = req.body.notebookId;

  if (!file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  if (!rawId) {
    res.status(400).json({ error: "notebookId is required" });
    return;
  }

  const notebookId = parseInt(rawId, 10);

  if (!await ownsNotebook(user.id!, notebookId)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const filepath = `/api/note-files/serve/${file.filename}`;
  const [saved] = await db.insert(noteFilesTable).values({
    notebookId,
    filename: file.originalname,
    filepath,
  }).returning();

  res.status(201).json(saved);
});

router.delete("/note-files/:id", requireStudent, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthReq).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [nf] = await db.select().from(noteFilesTable).where(eq(noteFilesTable.id, id)).limit(1);
  if (!nf) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  if (!await ownsNotebook(user.id!, nf.notebookId)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  try {
    const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";
    const filename = nf.filepath.split("/").pop()!;
    const physicalPath = path.join(UPLOAD_DIR, "note-files", filename);
    if (fs.existsSync(physicalPath)) fs.unlinkSync(physicalPath);
  } catch { /* non-critical */ }

  await db.delete(noteFilesTable).where(eq(noteFilesTable.id, id));
  res.sendStatus(204);
});

// Serve note files
router.get("/note-files/serve/:filename", requireStudent, (req: Request, res: Response): void => {
  const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";
  const raw = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;
  const filepath = path.join(UPLOAD_DIR, "note-files", raw);

  if (!fs.existsSync(filepath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  res.sendFile(path.resolve(filepath));
});

export default router;
