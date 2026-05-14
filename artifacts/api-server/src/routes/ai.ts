import { Router } from "express";
import { db, filesTable, notesTable, noteFilesTable, notebooksTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireStudent } from "../middlewares/auth.js";
import Anthropic from "@anthropic-ai/sdk";
import type { Request, Response } from "express";
import type { JwtPayload } from "../middlewares/auth.js";
import fs from "fs";
import path from "path";

const router = Router();
type AuthReq = Request & { user: JwtPayload };

const anthropic = new Anthropic({
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY ?? "placeholder",
});

async function extractTextFromFile(filepath: string, filename: string): Promise<string> {
  const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";
  const fileHash = filepath.split("/").pop()!;

  // Try teacher-files first, then note-files
  let physicalPath = path.join(UPLOAD_DIR, "teacher-files", fileHash);
  if (!fs.existsSync(physicalPath)) {
    physicalPath = path.join(UPLOAD_DIR, "note-files", fileHash);
  }

  if (!fs.existsSync(physicalPath)) {
    throw new Error("File not found on disk");
  }

  const ext = filename.toLowerCase().split(".").pop();

  if (ext === "txt") {
    return fs.readFileSync(physicalPath, "utf8");
  }

  if (ext === "pdf") {
    try {
      const pdfParseModule = await import("pdf-parse");
      const pdfParse = (pdfParseModule as unknown as { default: (buf: Buffer) => Promise<{ text: string }> }).default ?? pdfParseModule;
      const buffer = fs.readFileSync(physicalPath);
      const data = await (pdfParse as (buf: Buffer) => Promise<{ text: string }>)(buffer);
      return data.text;
    } catch {
      throw new Error("Could not extract text from PDF");
    }
  }

  throw new Error("Only PDF and TXT files can be summarized");
}

router.post("/ai/summarize", requireStudent, async (req: Request, res: Response): Promise<void> => {
  const { fileId } = req.body;

  if (!fileId) {
    res.status(400).json({ error: "fileId is required" });
    return;
  }

  const [file] = await db.select().from(filesTable).where(eq(filesTable.id, parseInt(fileId, 10))).limit(1);
  if (!file) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  let text: string;
  try {
    text = await extractTextFromFile(file.filepath, file.filename);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Could not read file";
    res.status(400).json({ error: msg });
    return;
  }

  if (!text || text.trim().length < 10) {
    res.status(400).json({ error: "File has no readable text content" });
    return;
  }

  const message = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Analyze the following educational content and provide a structured summary. Return ONLY valid JSON with this exact structure:
{
  "mainTopic": "string - the main subject/topic in 1-2 sentences",
  "keyPoints": ["array of 5-7 key points as strings"],
  "importantNotes": ["array of 3-5 important notes or tips as strings"]
}

Content to analyze:
${text.slice(0, 6000)}`,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    const parsed = JSON.parse(jsonMatch[0]);
    res.json({
      mainTopic: parsed.mainTopic ?? "Unknown topic",
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      importantNotes: Array.isArray(parsed.importantNotes) ? parsed.importantNotes : [],
    });
  } catch {
    res.status(500).json({ error: "Failed to parse AI response" });
  }
});

router.post("/ai/flashcards", requireStudent, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthReq).user;
  const { notebookIds } = req.body;

  if (!notebookIds || !Array.isArray(notebookIds) || notebookIds.length === 0) {
    res.status(400).json({ error: "Please select at least one notebook" });
    return;
  }

  // Verify student owns all requested notebooks
  const ids = notebookIds.map((id: unknown) => parseInt(String(id), 10));
  const ownedNotebooks = await db.select().from(notebooksTable).where(
    and(
      inArray(notebooksTable.id, ids),
      eq(notebooksTable.studentId, user.id!)
    )
  );

  if (ownedNotebooks.length !== ids.length) {
    res.status(403).json({ error: "Access denied to one or more notebooks" });
    return;
  }

  // Collect all written notes
  const notes = await db.select().from(notesTable).where(inArray(notesTable.notebookId, ids));
  const writtenContent = notes.map(n => n.content).filter(Boolean).join("\n\n");

  // Collect all uploaded note files text
  const noteFiles = await db.select().from(noteFilesTable).where(inArray(noteFilesTable.notebookId, ids));
  let fileContent = "";
  for (const nf of noteFiles) {
    try {
      const text = await extractTextFromFile(nf.filepath, nf.filename);
      fileContent += `\n\n${text}`;
    } catch {
      // skip unreadable files
    }
  }

  const combinedContent = (writtenContent + fileContent).trim();

  if (!combinedContent || combinedContent.length < 10) {
    res.status(400).json({ error: "Selected notebooks have no notes. Please add notes before generating flashcards." });
    return;
  }

  const message = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Generate exactly 10 educational flashcards from the following study notes. Return ONLY valid JSON with this exact structure:
{
  "flashcards": [
    {"question": "string", "answer": "string"},
    ...
  ]
}

Study notes:
${combinedContent.slice(0, 6000)}`,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.flashcards)) throw new Error("Invalid flashcards array");
    res.json({ flashcards: parsed.flashcards.slice(0, 10) });
  } catch {
    res.status(500).json({ error: "Failed to parse AI response" });
  }
});

export default router;
