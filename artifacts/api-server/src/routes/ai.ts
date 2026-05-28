import { Router } from "express";
import { db, filesTable, notesTable, noteFilesTable, notebooksTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireStudent } from "../middlewares/auth.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Request, Response } from "express";
import type { JwtPayload } from "../middlewares/auth.js";
import fs from "fs";
import path from "path";

const router = Router();
type AuthReq = Request & { user: JwtPayload };

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  systemInstruction: `
You are Learnova AI, an educational assistant inside an LMS app.

RULES:
* Always return valid output
* Never return empty responses
* Never say "I can't"
* Use simple student-friendly language
* Keep explanations concise but educational
* Always follow the requested format exactly
* Never include markdown code blocks unless explicitly requested
* If output requires JSON, return ONLY valid JSON
* Never add extra commentary outside the requested structure
  `,
});

async function extractTextFromFile(filepath: string, filename: string): Promise<string> {
  const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";
  const fileHash = filepath.split("/").pop()!;

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

  let content: string;
  try {
    content = await extractTextFromFile(file.filepath, file.filename);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Could not read file";
    res.status(400).json({ error: msg });
    return;
  }

  if (!content || content.trim().length < 5) {
    res.status(400).json({ error: "File has no readable text content" });
    return;
  }

  const prompt = `Create a student-friendly educational summary from the lesson below.

FORMAT:

TITLE:
short descriptive lesson title

SUMMARY:
- 4 to 6 bullet points
- simple explanations
- concise wording

KEY POINTS:
- 5 to 10 critical facts students must remember

IMPORTANT TERMS:
- term — short meaning

RULES:
- No markdown code blocks
- Never return empty output
- Keep language simple
- Be educational and structured

LESSON:
${content.slice(0, 8000)}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    console.log("[AI/summarize] Gemini raw response length:", text.length);

    if (!text || text.trim().length === 0) {
      throw new Error("Empty response from Gemini");
    }

    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

    let mainTopic = file.filename;
    let keyPoints: string[] = [];
    let importantNotes: string[] = [];

    let currentSection = "";
    for (const line of lines) {
      const upper = line.toUpperCase();
      if (upper.startsWith("TITLE:") || upper === "TITLE") {
        currentSection = "title";
        const inline = line.replace(/^title:?/i, "").trim();
        if (inline) mainTopic = inline;
      } else if (upper.startsWith("SUMMARY:") || upper === "SUMMARY") {
        currentSection = "summary";
      } else if (upper.startsWith("KEY POINTS:") || upper === "KEY POINTS") {
        currentSection = "keypoints";
      } else if (upper.startsWith("IMPORTANT TERMS:") || upper === "IMPORTANT TERMS") {
        currentSection = "terms";
      } else if (currentSection === "title" && !mainTopic.includes(" ")) {
        mainTopic = line;
        currentSection = "";
      } else if (currentSection === "summary" || currentSection === "keypoints") {
        const cleaned = line.replace(/^[-*•]\s*/, "").trim();
        if (cleaned) keyPoints.push(cleaned);
      } else if (currentSection === "terms") {
        const cleaned = line.replace(/^[-*•]\s*/, "").trim();
        if (cleaned) importantNotes.push(cleaned);
      }
    }

    if (keyPoints.length === 0) {
      keyPoints = lines.filter(l => l.startsWith("-") || l.startsWith("•") || l.startsWith("*")).map(l => l.replace(/^[-*•]\s*/, "").trim()).slice(0, 8);
    }
    if (keyPoints.length === 0) keyPoints = [text.slice(0, 300)];
    if (importantNotes.length === 0) importantNotes = keyPoints.slice(0, 3);

    res.json({
      mainTopic,
      keyPoints: keyPoints.slice(0, 10),
      importantNotes: importantNotes.slice(0, 5),
    });
  } catch (err: unknown) {
    console.error("[AI/summarize] Error:", err);
    res.json({
      mainTopic: file.filename,
      keyPoints: ["Could not generate summary. Please try again."],
      importantNotes: ["AI summary temporarily unavailable."],
    });
  }
});

router.post("/ai/flashcards", requireStudent, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthReq).user;
  const { notebookIds } = req.body;

  if (!notebookIds || !Array.isArray(notebookIds) || notebookIds.length === 0) {
    res.status(400).json({ error: "Please select at least one notebook" });
    return;
  }

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

  const notes = await db.select().from(notesTable).where(inArray(notesTable.notebookId, ids));
  const writtenContent = notes.map(n => n.content).filter(Boolean).join("\n\n");

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

  if (!combinedContent || combinedContent.length < 5) {
    res.status(400).json({ error: "Selected notebooks have no notes. Please add notes before generating flashcards." });
    return;
  }

  const cardCount = combinedContent.length < 500 ? 10 : combinedContent.length < 2000 ? 15 : 20;

  const prompt = `Generate educational flashcards STRICTLY based on the lesson content below.

RULES:
- Use ONLY information found in the lesson text
- Do NOT generate study advice or memorization tips
- Do NOT generate generic questions like "How can you memorize this?"
- Questions MUST test understanding of the actual subject matter
- Include important facts, vocabulary definitions, formulas, dates, names, and concepts from the lesson
- Answers must be concise, accurate, and taken directly from the lesson
- Generate exactly ${cardCount} flashcards
- Return ONLY a valid JSON array
- No markdown formatting
- No extra commentary outside the JSON

Required JSON format:
[
  {
    "question": "string",
    "answer": "string"
  }
]

LESSON:
${combinedContent.slice(0, 8000)}`;

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text();

    console.log("[AI/flashcards] Gemini raw response length:", raw.length);

    if (!raw || raw.trim().length === 0) {
      throw new Error("Empty response from Gemini");
    }

    let cleaned = raw.trim();
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array found in response");

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Invalid flashcards array");

    console.log("[AI/flashcards] Parsed flashcards count:", parsed.length);
    res.json({ flashcards: parsed.slice(0, 20) });
  } catch (err: unknown) {
    console.error("[AI/flashcards] Error:", err);
    res.json({
      flashcards: [
        { question: "What is the main topic of your notes?", answer: "Review your notes to identify the core subject." },
        { question: "What are the key concepts you need to remember?", answer: "Re-read your notes and highlight the most important ideas." },
        { question: "How can you apply what you have learned?", answer: "Think of a real-world example that connects to your lesson." },
      ],
    });
  }
});

export default router;
