import { Router } from "express";
import { db, notesTable, notebooksTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireStudent } from "../middlewares/auth.js";
import type { Request, Response } from "express";
import type { JwtPayload } from "../middlewares/auth.js";

const router = Router();
type AuthReq = Request & { user: JwtPayload };

async function ownsNotebook(studentId: number, notebookId: number): Promise<boolean> {
  const [nb] = await db.select().from(notebooksTable).where(
    and(eq(notebooksTable.id, notebookId), eq(notebooksTable.studentId, studentId))
  ).limit(1);
  return !!nb;
}

router.get("/notes", requireStudent, async (req: Request, res: Response): Promise<void> => {
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

  const rows = await db.select().from(notesTable).where(eq(notesTable.notebookId, notebookId));
  res.json(rows);
});

router.post("/notes", requireStudent, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthReq).user;
  const { notebookId, content } = req.body;

  if (!notebookId || content == null) {
    res.status(400).json({ error: "notebookId and content are required" });
    return;
  }

  if (!await ownsNotebook(user.id!, notebookId)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const [note] = await db.insert(notesTable).values({ notebookId, content }).returning();
  res.status(201).json(note);
});

router.patch("/notes/:id", requireStudent, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthReq).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { content } = req.body;

  if (content == null) {
    res.status(400).json({ error: "content is required" });
    return;
  }

  // verify ownership via notebook
  const [note] = await db.select().from(notesTable).where(eq(notesTable.id, id)).limit(1);
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  if (!await ownsNotebook(user.id!, note.notebookId)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const [updated] = await db.update(notesTable).set({ content }).where(eq(notesTable.id, id)).returning();
  res.json(updated);
});

router.delete("/notes/:id", requireStudent, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthReq).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [note] = await db.select().from(notesTable).where(eq(notesTable.id, id)).limit(1);
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  if (!await ownsNotebook(user.id!, note.notebookId)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  await db.delete(notesTable).where(eq(notesTable.id, id));
  res.sendStatus(204);
});

export default router;
