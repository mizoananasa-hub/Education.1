import { Router } from "express";
import { db, studentsTable, homeworksTable, homeworkQuestionsTable, homeworkSubmissionsTable, homeworkAnswersTable, notificationsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth, requireTeacher } from "../middlewares/auth.js";
import type { Request, Response } from "express";
import type { JwtPayload } from "../middlewares/auth.js";

const router = Router();
type AuthReq = Request & { user: JwtPayload };

const ALL_SUBJECTS = ["Mathematics", "French", "English", "Arabic", "ICT", "Social Studies"];
const LOWER_ONLY = ["Science"];
const UPPER_ONLY = ["Biology", "Physics", "Chemistry"];
const RELIGION_MAP: Record<string, string> = {
  "Islamic": "Islamic Revision",
  "Christian": "Christian Religion",
};

function getStudentSubjects(grade: number, religion: string): string[] {
  const subjects = [...ALL_SUBJECTS];
  if (grade < 9) subjects.push(...LOWER_ONLY);
  else subjects.push(...UPPER_ONLY);
  const relSub = RELIGION_MAP[religion];
  if (relSub) subjects.push(relSub);
  return subjects;
}

// ── Teacher: create homework ──────────────────────────────────────────────────
router.post("/homework", requireTeacher, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthReq).user;
  const { title, description, dueDate, timeLimitMinutes, questions } = req.body;

  if (!title || !dueDate || !questions || !Array.isArray(questions) || questions.length === 0) {
    res.status(400).json({ error: "title, dueDate, and at least one question are required" });
    return;
  }

  const [hw] = await db.insert(homeworksTable).values({
    subject: user.subject!,
    teacherName: user.fullName,
    title,
    description: description || null,
    dueDate: new Date(dueDate),
    timeLimitMinutes: timeLimitMinutes ? Number(timeLimitMinutes) : null,
  }).returning();

  const questionRows = (questions as any[]).map((q, i) => ({
    homeworkId: hw.id,
    questionText: q.questionText,
    questionType: q.questionType,
    gradingMode: q.gradingMode ?? "auto",
    options: q.options ? JSON.stringify(q.options) : null,
    correctAnswer: q.correctAnswer ?? null,
    points: q.points ?? 1,
    orderIndex: i,
  }));

  await db.insert(homeworkQuestionsTable).values(questionRows);

  // Notify eligible students
  try {
    const allStudents = await db.select().from(studentsTable);
    const eligible = allStudents.filter(s =>
      getStudentSubjects(s.grade, s.religion).includes(user.subject!)
    );
    if (eligible.length > 0) {
      await db.insert(notificationsTable).values(
        eligible.map(s => ({
          userId: s.id,
          userType: "student",
          type: "new_homework",
          title: "New Homework Assigned",
          message: `${user.fullName} posted "${title}" for ${user.subject!}. Due: ${new Date(dueDate).toLocaleDateString()}.`,
          relatedId: hw.id,
          isRead: false,
        }))
      );
    }
  } catch { /* non-critical */ }

  res.status(201).json({ id: hw.id, message: "Homework created" });
});

// ── Teacher: list their homeworks ────────────────────────────────────────────
router.get("/homework/teacher", requireTeacher, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthReq).user;
  const rows = await db.select().from(homeworksTable)
    .where(eq(homeworksTable.subject, user.subject!))
    .orderBy(homeworksTable.createdAt);

  // Attach submission counts
  const hwIds = rows.map(r => r.id);
  let subCounts: Record<number, number> = {};
  if (hwIds.length > 0) {
    const subs = await db.select().from(homeworkSubmissionsTable)
      .where(inArray(homeworkSubmissionsTable.homeworkId, hwIds));
    for (const s of subs) subCounts[s.homeworkId] = (subCounts[s.homeworkId] ?? 0) + 1;
  }

  res.json(rows.map(r => ({ ...r, submissionCount: subCounts[r.id] ?? 0 })));
});

// ── Teacher: get single homework with questions ───────────────────────────────
router.get("/homework/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [hw] = await db.select().from(homeworksTable).where(eq(homeworksTable.id, id)).limit(1);
  if (!hw) { res.status(404).json({ error: "Not found" }); return; }

  const questions = await db.select().from(homeworkQuestionsTable)
    .where(eq(homeworkQuestionsTable.homeworkId, id))
    .orderBy(homeworkQuestionsTable.orderIndex);

  const user = (req as AuthReq).user;
  // Students: hide correct answers
  const sanitized = user.role === "student"
    ? questions.map(q => ({ ...q, correctAnswer: null }))
    : questions;

  res.json({ ...hw, questions: sanitized });
});

// ── Teacher: delete homework ──────────────────────────────────────────────────
router.delete("/homework/:id", requireTeacher, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthReq).user;
  const id = parseInt(req.params.id as string, 10);
  const [hw] = await db.select().from(homeworksTable).where(eq(homeworksTable.id, id)).limit(1);
  if (!hw || hw.subject !== user.subject) { res.status(404).json({ error: "Not found" }); return; }
  await db.delete(homeworksTable).where(eq(homeworksTable.id, id));
  res.sendStatus(204);
});

// ── Teacher: get submissions for a homework ───────────────────────────────────
router.get("/homework/:id/submissions", requireTeacher, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [hw] = await db.select().from(homeworksTable).where(eq(homeworksTable.id, id)).limit(1);
  const user = (req as AuthReq).user;
  if (!hw || hw.subject !== user.subject) { res.status(404).json({ error: "Not found" }); return; }

  const submissions = await db.select().from(homeworkSubmissionsTable)
    .where(eq(homeworkSubmissionsTable.homeworkId, id));

  const result = await Promise.all(
    submissions.map(async sub => {
      const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, sub.studentId)).limit(1);
      const answers = await db.select().from(homeworkAnswersTable)
        .where(eq(homeworkAnswersTable.submissionId, sub.id));
      return { ...sub, studentName: student?.fullName ?? "Unknown", answers };
    })
  );
  res.json(result);
});

// ── Teacher: grade a manual answer ───────────────────────────────────────────
router.patch("/homework/answers/:answerId/grade", requireTeacher, async (req: Request, res: Response): Promise<void> => {
  const answerId = parseInt(req.params.answerId as string, 10);
  const { manualScore, teacherFeedback } = req.body;

  await db.update(homeworkAnswersTable)
    .set({ manualScore: manualScore ?? null, teacherFeedback: teacherFeedback ?? null })
    .where(eq(homeworkAnswersTable.id, answerId));

  // Recalculate submission score
  const [answer] = await db.select().from(homeworkAnswersTable).where(eq(homeworkAnswersTable.id, answerId)).limit(1);
  if (answer) {
    const allAnswers = await db.select().from(homeworkAnswersTable)
      .where(eq(homeworkAnswersTable.submissionId, answer.submissionId));
    const questions = await db.select().from(homeworkQuestionsTable)
      .where(inArray(homeworkQuestionsTable.id, allAnswers.map(a => a.questionId)));

    const maxScore = questions.reduce((s, q) => s + q.points, 0);
    const totalScore = allAnswers.reduce((s, a) => {
      const q = questions.find(q => q.id === a.questionId);
      if (!q) return s;
      const score = q.gradingMode === "manual" ? (a.manualScore ?? 0) : (a.autoScore ?? 0);
      return s + score;
    }, 0);
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    // Check if all manual questions have been graded
    const needsGrading = allAnswers.some(a => {
      const q = questions.find(q => q.id === a.questionId);
      return q?.gradingMode === "manual" && a.manualScore == null;
    });

    await db.update(homeworkSubmissionsTable)
      .set({ totalScore, maxScore, percentage, status: needsGrading ? "submitted" : "graded" })
      .where(eq(homeworkSubmissionsTable.id, answer.submissionId));

    // Notify student if fully graded
    if (!needsGrading) {
      const [sub] = await db.select().from(homeworkSubmissionsTable).where(eq(homeworkSubmissionsTable.id, answer.submissionId)).limit(1);
      if (sub) {
        const [hw] = await db.select().from(homeworksTable).where(eq(homeworksTable.id, sub.homeworkId)).limit(1);
        try {
          await db.insert(notificationsTable).values({
            userId: sub.studentId,
            userType: "student",
            type: "homework_graded",
            title: "Homework Graded",
            message: `Your submission for "${hw?.title}" has been graded. Score: ${percentage}%.`,
            relatedId: sub.homeworkId,
            isRead: false,
          });
        } catch { /* non-critical */ }
      }
    }
  }
  res.json({ message: "Answer graded" });
});

// ── Student: list available homeworks ────────────────────────────────────────
router.get("/homework/student/available", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthReq).user;
  if (user.role !== "student") { res.status(403).json({ error: "Students only" }); return; }

  const mySubjects = getStudentSubjects(user.grade!, user.religion!);
  const all = await db.select().from(homeworksTable);
  const available = all.filter(h => mySubjects.includes(h.subject));

  const mySubmissions = await db.select().from(homeworkSubmissionsTable)
    .where(eq(homeworkSubmissionsTable.studentId, user.id!));
  const subMap: Record<number, typeof mySubmissions[0]> = {};
  for (const s of mySubmissions) subMap[s.homeworkId] = s;

  res.json(available.map(hw => ({
    ...hw,
    submission: subMap[hw.id] ?? null,
    status: subMap[hw.id]
      ? subMap[hw.id].status === "graded" ? "Graded" : "Submitted"
      : new Date(hw.dueDate) < new Date() ? "Overdue" : "Not Started",
  })));
});

// ── Student: submit homework ──────────────────────────────────────────────────
router.post("/homework/:id/submit", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthReq).user;
  if (user.role !== "student") { res.status(403).json({ error: "Students only" }); return; }

  const homeworkId = parseInt(req.params.id as string, 10);
  const { answers } = req.body; // [{ questionId, answer }]
  if (!answers || !Array.isArray(answers)) {
    res.status(400).json({ error: "answers array required" }); return;
  }

  // Prevent double submission
  const existing = await db.select().from(homeworkSubmissionsTable)
    .where(and(eq(homeworkSubmissionsTable.homeworkId, homeworkId), eq(homeworkSubmissionsTable.studentId, user.id!)))
    .limit(1);
  if (existing.length > 0) { res.status(409).json({ error: "Already submitted" }); return; }

  const questions = await db.select().from(homeworkQuestionsTable)
    .where(eq(homeworkQuestionsTable.homeworkId, homeworkId));
  const maxScore = questions.reduce((s, q) => s + q.points, 0);

  // Auto-grade
  let totalScore = 0;
  const answerRows = answers.map((a: { questionId: number; answer: string }) => {
    const q = questions.find(q => q.id === a.questionId);
    let autoScore: number | null = null;
    if (q && q.gradingMode === "auto" && q.correctAnswer) {
      const correct = q.correctAnswer.trim().toLowerCase();
      const given = (a.answer ?? "").trim().toLowerCase();
      autoScore = correct === given ? q.points : 0;
      totalScore += autoScore as number;
    }
    return {
      questionId: a.questionId,
      answer: a.answer ?? null,
      autoScore,
      manualScore: null as null,
      teacherFeedback: null as null,
    };
  });

  const hasManual = questions.some(q => q.gradingMode === "manual");
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  const [sub] = await db.insert(homeworkSubmissionsTable).values({
    homeworkId,
    studentId: user.id!,
    totalScore,
    maxScore,
    percentage,
    status: hasManual ? "submitted" : "graded",
  }).returning();

  await db.insert(homeworkAnswersTable).values(
    answerRows.map(a => ({ submissionId: sub.id, ...a }))
  );

  // Notify teacher
  try {
    const [hw] = await db.select().from(homeworksTable).where(eq(homeworksTable.id, homeworkId)).limit(1);
    if (hw) {
      await db.insert(notificationsTable).values({
        teacherSubject: hw.subject,
        userType: "teacher",
        type: hasManual ? "manual_grading_required" : "submission_received",
        title: hasManual ? "Manual Grading Required" : "New Submission",
        message: `${user.fullName} submitted "${hw.title}"${hasManual ? " — some answers need manual grading." : "."}`,
        relatedId: homeworkId,
        isRead: false,
      });
    }
  } catch { /* non-critical */ }

  res.status(201).json({ submissionId: sub.id, totalScore, maxScore, percentage, status: sub.status });
});

// ── Student: get submission result ───────────────────────────────────────────
router.get("/homework/:id/my-result", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthReq).user;
  if (user.role !== "student") { res.status(403).json({ error: "Students only" }); return; }

  const homeworkId = parseInt(req.params.id as string, 10);
  const [sub] = await db.select().from(homeworkSubmissionsTable)
    .where(and(eq(homeworkSubmissionsTable.homeworkId, homeworkId), eq(homeworkSubmissionsTable.studentId, user.id!)))
    .limit(1);
  if (!sub) { res.status(404).json({ error: "No submission found" }); return; }

  const answers = await db.select().from(homeworkAnswersTable)
    .where(eq(homeworkAnswersTable.submissionId, sub.id));
  const questions = await db.select().from(homeworkQuestionsTable)
    .where(eq(homeworkQuestionsTable.homeworkId, homeworkId))
    .orderBy(homeworkQuestionsTable.orderIndex);

  res.json({ submission: sub, answers, questions });
});

export default router;
