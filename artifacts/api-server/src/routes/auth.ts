import { Router } from "express";
import bcrypt from "bcrypt";
import { db, studentsTable, adminsTable, studentRequestsTable, teacherRequestsTable, activityLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, verifyToken } from "../middlewares/auth.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import type { Request, Response } from "express";
import type { JwtPayload } from "../middlewares/auth.js";

const router = Router();

// ─── Admin Auth ──────────────────────────────────────────────────────────────

router.post("/auth/admin/signin", async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }

  const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.username, username)).limit(1);
  if (!admin) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  await db.insert(activityLogsTable).values({
    userId: admin.id,
    userRole: "admin",
    userName: admin.username,
    action: "login",
    details: "Admin signed in",
  });

  const token = signToken({
    role: "admin",
    id: admin.id,
    fullName: admin.username,
    username: admin.username,
  });

  res.json({
    token,
    user: {
      id: admin.id,
      fullName: admin.username,
      studentCode: null,
      grade: null,
      religion: null,
      subject: null,
      role: "admin",
    },
  });
});

// ─── Student Request (replaces signup) ───────────────────────────────────────

router.post("/auth/student/request", async (req: Request, res: Response): Promise<void> => {
  const { fullName, grade, religion, parentContact } = req.body;

  if (!fullName || !grade || !religion) {
    res.status(400).json({ error: "Full name, grade, and religion are required" });
    return;
  }

  const gradeNum = parseInt(grade, 10);
  if (isNaN(gradeNum) || gradeNum < 1 || gradeNum > 12) {
    res.status(400).json({ error: "Grade must be between 1 and 12" });
    return;
  }

  if (!["Islamic", "Christian"].includes(religion)) {
    res.status(400).json({ error: "Religion must be Islamic or Christian" });
    return;
  }

  const [request] = await db.insert(studentRequestsTable).values({
    fullName,
    grade: String(gradeNum),
    religion,
    parentContact: parentContact || null,
    status: "pending",
  }).returning();

  res.status(201).json({
    message: "Your request has been submitted. Please wait for admin approval.",
    requestId: request.id,
  });
});

// ─── Teacher Request ──────────────────────────────────────────────────────────

router.post("/auth/teacher/request", async (req: Request, res: Response): Promise<void> => {
  const { fullName, subject, email } = req.body;

  if (!fullName || !subject) {
    res.status(400).json({ error: "Full name and subject are required" });
    return;
  }

  const [request] = await db.insert(teacherRequestsTable).values({
    fullName,
    subject,
    email: email || null,
    status: "pending",
  }).returning();

  res.status(201).json({
    message: "Your request has been submitted. Please wait for admin approval.",
    requestId: request.id,
  });
});

// ─── Student Signin ───────────────────────────────────────────────────────────

router.post("/auth/student/signin", async (req: Request, res: Response): Promise<void> => {
  const { studentCode, password } = req.body;

  if (!studentCode || !password) {
    res.status(400).json({ error: "Student code and password are required" });
    return;
  }

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.studentCode, studentCode)).limit(1);
  if (!student) {
    res.status(401).json({ error: "Invalid student code or password" });
    return;
  }

  if (!student.isActive) {
    res.status(403).json({ error: "Your account has been disabled. Contact the administrator." });
    return;
  }

  const valid = await bcrypt.compare(password, student.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid student code or password" });
    return;
  }

  await db.insert(activityLogsTable).values({
    userId: student.id,
    userRole: "student",
    userName: student.fullName,
    action: "login",
    details: `Student ${student.studentCode} signed in`,
  });

  const token = signToken({
    role: "student",
    id: student.id,
    fullName: student.fullName,
    studentCode: student.studentCode,
    grade: student.grade,
    religion: student.religion,
  });

  res.json({
    token,
    user: {
      id: student.id,
      fullName: student.fullName,
      studentCode: student.studentCode,
      grade: student.grade,
      religion: student.religion,
      subject: null,
      role: "student",
    },
  });
});

// ─── Teacher Signin ───────────────────────────────────────────────────────────

router.post("/auth/teacher/signin", async (req: Request, res: Response): Promise<void> => {
  const { fullName, subject, subjectPassword } = req.body;

  if (!fullName || !subject || !subjectPassword) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }

  // Check if teacher is approved in DB
  const approvedTeacher = await db
    .select()
    .from(teacherRequestsTable)
    .where(eq(teacherRequestsTable.fullName, fullName))
    .limit(1);

  const teacherRecord = approvedTeacher.find(
    (t) => t.subject === subject && t.status === "approved"
  );

  if (!teacherRecord) {
    res.status(401).json({ error: "Teacher not found or not yet approved. Please submit a request or contact admin." });
    return;
  }

  // Verify subject password stored in teacher record (set by admin on approval)
  const validPassword = await bcrypt.compare(subjectPassword, (teacherRecord as any).passwordHash ?? "");
  if (!validPassword) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }

  await db.insert(activityLogsTable).values({
    userId: teacherRecord.id,
    userRole: "teacher",
    userName: fullName,
    action: "login",
    details: `Teacher ${fullName} (${subject}) signed in`,
  });

  const token = signToken({
    role: "teacher",
    id: teacherRecord.id,
    fullName,
    subject,
  });

  res.json({
    token,
    user: {
      id: teacherRecord.id,
      fullName,
      studentCode: null,
      grade: null,
      religion: null,
      subject,
      role: "teacher",
    },
  });
});

// ─── Change Password ──────────────────────────────────────────────────────────

router.patch("/auth/password", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user: JwtPayload }).user;

  if (user.role !== "student") {
    res.status(403).json({ error: "Only students can change their password" });
    return;
  }

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Current and new passwords are required" });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: "New password must be at least 6 characters" });
    return;
  }

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, user.id!)).limit(1);
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, student.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await db.update(studentsTable).set({ passwordHash: newHash }).where(eq(studentsTable.id, student.id));

  res.json({ message: "Password updated successfully" });
});

// ─── Me ───────────────────────────────────────────────────────────────────────

router.get("/auth/me", requireAuth, (req: Request, res: Response): void => {
  const user = (req as Request & { user: JwtPayload }).user;
  res.json({
    id: user.id ?? null,
    fullName: user.fullName,
    studentCode: user.studentCode ?? null,
    grade: user.grade ?? null,
    religion: user.religion ?? null,
    subject: user.subject ?? null,
    role: user.role,
  });
});

export default router;
