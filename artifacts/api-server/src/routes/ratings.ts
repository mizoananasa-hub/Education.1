import { Router } from "express";
import { db, ratingsTable, studentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireTeacher, requireStudent, requireAuth } from "../middlewares/auth.js";
import type { Request, Response } from "express";
import type { JwtPayload } from "../middlewares/auth.js";

const router = Router();
type AuthReq = Request & { user: JwtPayload };

function getLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Average";
  return "Needs Improvement";
}

// Teacher: list all ratings for their subject (with student names)
router.get("/ratings", requireTeacher, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthReq).user;

  const rows = await db
    .select({
      id: ratingsTable.id,
      studentId: ratingsTable.studentId,
      subject: ratingsTable.subject,
      teacherName: ratingsTable.teacherName,
      score: ratingsTable.score,
      label: ratingsTable.label,
      comment: ratingsTable.comment,
      createdAt: ratingsTable.createdAt,
      studentName: studentsTable.fullName,
    })
    .from(ratingsTable)
    .leftJoin(studentsTable, eq(ratingsTable.studentId, studentsTable.id))
    .where(eq(ratingsTable.subject, user.subject!));

  res.json(rows);
});

// Student: get all their ratings across subjects
router.get("/ratings/my", requireStudent, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthReq).user;

  const rows = await db.select().from(ratingsTable).where(eq(ratingsTable.studentId, user.id!));
  res.json(rows.map(r => ({ ...r, studentName: null })));
});

// Student: get rating for a specific subject
router.get("/ratings/subject/:subject", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthReq).user;
  const raw = Array.isArray(req.params.subject) ? req.params.subject[0] : req.params.subject;
  const subject = decodeURIComponent(raw);

  let whereClause;
  if (user.role === "student") {
    whereClause = and(eq(ratingsTable.studentId, user.id!), eq(ratingsTable.subject, subject));
  } else {
    res.status(403).json({ error: "Students only" });
    return;
  }

  const [rating] = await db.select().from(ratingsTable).where(whereClause).limit(1);

  if (!rating) {
    res.status(404).json({ error: "No rating found for this subject" });
    return;
  }

  res.json({ ...rating, studentName: null });
});

// Teacher: upsert a rating for a student
router.put("/ratings/:studentId", requireTeacher, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthReq).user;
  const raw = Array.isArray(req.params.studentId) ? req.params.studentId[0] : req.params.studentId;
  const studentId = parseInt(raw, 10);

  const { score, comment } = req.body;
  if (score == null || isNaN(parseInt(score))) {
    res.status(400).json({ error: "score is required" });
    return;
  }

  const scoreNum = parseInt(score, 10);
  if (scoreNum < 0 || scoreNum > 100) {
    res.status(400).json({ error: "score must be between 0 and 100" });
    return;
  }

  const label = getLabel(scoreNum);
  const subject = user.subject!;

  // Check student exists
  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, studentId)).limit(1);
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const [rating] = await db
    .insert(ratingsTable)
    .values({ studentId, subject, teacherName: user.fullName, score: scoreNum, label, comment: comment ?? null })
    .onConflictDoUpdate({
      target: [ratingsTable.studentId, ratingsTable.subject],
      set: { score: scoreNum, label, comment: comment ?? null, teacherName: user.fullName },
    })
    .returning();

  res.json({ ...rating, studentName: student.fullName });
});

export default router;
