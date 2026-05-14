import { Router } from "express";
import { db, notebooksTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireStudent } from "../middlewares/auth.js";
import type { Request, Response } from "express";
import type { JwtPayload } from "../middlewares/auth.js";

const router = Router();
type AuthReq = Request & { user: JwtPayload };

router.get("/notebooks", requireStudent, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthReq).user;
  const { subject } = req.query;

  if (!subject || typeof subject !== "string") {
    res.status(400).json({ error: "subject query param required" });
    return;
  }

  const rows = await db.select().from(notebooksTable).where(
    and(eq(notebooksTable.studentId, user.id!), eq(notebooksTable.subject, subject))
  );

  res.json(rows);
});

router.post("/notebooks", requireStudent, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthReq).user;
  const { subject, notebookName } = req.body;

  if (!subject || !notebookName) {
    res.status(400).json({ error: "subject and notebookName are required" });
    return;
  }

  const [notebook] = await db.insert(notebooksTable).values({
    studentId: user.id!,
    subject,
    notebookName,
  }).returning();

  res.status(201).json(notebook);
});

router.patch("/notebooks/:id", requireStudent, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthReq).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { notebookName } = req.body;

  if (!notebookName) {
    res.status(400).json({ error: "notebookName is required" });
    return;
  }

  const [notebook] = await db.update(notebooksTable)
    .set({ notebookName })
    .where(and(eq(notebooksTable.id, id), eq(notebooksTable.studentId, user.id!)))
    .returning();

  if (!notebook) {
    res.status(404).json({ error: "Notebook not found" });
    return;
  }

  res.json(notebook);
});

router.delete("/notebooks/:id", requireStudent, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthReq).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [notebook] = await db.delete(notebooksTable)
    .where(and(eq(notebooksTable.id, id), eq(notebooksTable.studentId, user.id!)))
    .returning();

  if (!notebook) {
    res.status(404).json({ error: "Notebook not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
