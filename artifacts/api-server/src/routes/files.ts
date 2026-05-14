import { Router } from "express";
import { db, filesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireTeacher, requireAuth } from "../middlewares/auth.js";
import { teacherUpload } from "../lib/upload.js";
import type { Request, Response } from "express";
import type { JwtPayload } from "../middlewares/auth.js";
import fs from "fs";
import path from "path";

const router = Router();

type AuthReq = Request & { user: JwtPayload };

router.get("/files", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { subject } = req.query;
  if (!subject || typeof subject !== "string") {
    res.status(400).json({ error: "subject query param required" });
    return;
  }

  const files = await db.select().from(filesTable).where(eq(filesTable.subject, subject));
  res.json(files.map(f => ({
    id: f.id,
    filename: f.filename,
    filepath: f.filepath,
    subject: f.subject,
    uploadedBy: f.uploadedBy,
    createdAt: f.createdAt,
  })));
});

router.post("/files", requireTeacher, teacherUpload.single("file"), async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthReq).user;
  const file = req.file;
  const { subject } = req.body;

  if (!file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  if (!subject) {
    res.status(400).json({ error: "subject is required" });
    return;
  }

  // Only teacher can upload for their own subject
  if (subject !== user.subject) {
    res.status(403).json({ error: "You can only upload for your own subject" });
    return;
  }

  const filepath = `/api/files/serve/${file.filename}`;

  const [saved] = await db.insert(filesTable).values({
    filename: file.originalname,
    filepath,
    subject,
    uploadedBy: user.fullName,
  }).returning();

  res.status(201).json({
    id: saved.id,
    filename: saved.filename,
    filepath: saved.filepath,
    subject: saved.subject,
    uploadedBy: saved.uploadedBy,
    createdAt: saved.createdAt,
  });
});

router.delete("/files/:id", requireTeacher, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthReq).user;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [file] = await db.select().from(filesTable).where(
    and(eq(filesTable.id, id), eq(filesTable.subject, user.subject!))
  );

  if (!file) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  // Try to delete the physical file
  try {
    const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";
    const filename = file.filepath.split("/").pop()!;
    const physicalPath = path.join(UPLOAD_DIR, "teacher-files", filename);
    if (fs.existsSync(physicalPath)) {
      fs.unlinkSync(physicalPath);
    }
  } catch {
    // non-critical
  }

  await db.delete(filesTable).where(eq(filesTable.id, id));
  res.sendStatus(204);
});

// Serve uploaded files
router.get("/files/serve/:filename", requireAuth, (req: Request, res: Response): void => {
  const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";
  const raw = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;
  const filepath = path.join(UPLOAD_DIR, "teacher-files", raw);

  if (!fs.existsSync(filepath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  res.sendFile(path.resolve(filepath));
});

export default router;
