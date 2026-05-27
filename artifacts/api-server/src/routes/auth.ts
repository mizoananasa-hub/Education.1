import { Router } from "express";
import bcrypt from "bcrypt";
import { db, studentsTable, adminsTable, teachersTable, teacherSubjectsTable, teacherGradesTable, activityLogsTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { signToken, requireAuth } from "../middlewares/auth.js";
import type { Request, Response } from "express";
import type { JwtPayload } from "../middlewares/auth.js";

const router = Router();

// ─── Admin Auth ──────────────────────────────────────────────────────────────

router.post("/auth/admin/signin", async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;
  if (!username || !password) { res.status(400).json({ error: "Username and password are required" }); return; }

  const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.username, username)).limit(1);
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  await db.insert(activityLogsTable).values({
    userId: admin.id, userRole: "admin", userName: admin.username,
    action: "login", details: "Admin signed in",
  });

  const token = signToken({ role: "admin", id: admin.id, fullName: admin.username, username: admin.username });
  res.json({ token, user: { id: admin.id, fullName: admin.username, studentCode: null, grade: null, religion: null, subject: null, role: "admin" } });
});

// ─── Student Signup (goes to pending) ────────────────────────────────────────

router.post("/auth/student/signup", async (req: Request, res: Response): Promise<void> => {
  const { fullName, email, grade, religion, password, confirmPassword } = req.body;

  if (!fullName || !grade || !religion || !password) {
    res.status(400).json({ error: "Full name, grade, religion, and password are required" });
    return;
  }
  if (password !== confirmPassword) {
    res.status(400).json({ error: "Passwords do not match" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
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

  // Check for duplicate email
  if (email) {
    const existing = await db.select().from(studentsTable).where(eq(studentsTable.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "An account with this email already exists" });
      return;
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Auto-generate a temp student code (will be proper after approval)
  const tempCode = `PENDING-${Date.now()}`;

  await db.insert(studentsTable).values({
    fullName,
    email: email || null,
    studentCode: tempCode,
    passwordHash,
    grade: gradeNum,
    religion,
    accountStatus: "pending",
    isActive: false,
  });

  res.status(201).json({
    message: "Your account request has been submitted. You will be able to sign in once an admin approves your account.",
  });
});

// ─── Student Signin ───────────────────────────────────────────────────────────

router.post("/auth/student/signin", async (req: Request, res: Response): Promise<void> => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    res.status(400).json({ error: "Student code or email, and password are required" });
    return;
  }

  // Try student code first, then email
  const results = await db.select().from(studentsTable).where(
    or(eq(studentsTable.studentCode, identifier), eq(studentsTable.email, identifier))
  ).limit(1);

  const student = results[0];
  if (!student) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (student.accountStatus === "pending") {
    res.status(403).json({ error: "Your account is waiting for admin approval." });
    return;
  }
  if (student.accountStatus === "rejected") {
    res.status(403).json({ error: "Your account request was rejected. Please contact the administrator." });
    return;
  }
  if (!student.isActive) {
    res.status(403).json({ error: "Your account has been disabled. Contact the administrator." });
    return;
  }

  const valid = await bcrypt.compare(password, student.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  await db.insert(activityLogsTable).values({
    userId: student.id, userRole: "student", userName: student.fullName,
    action: "login", details: `Student ${student.studentCode} signed in`,
  });

  const token = signToken({
    role: "student", id: student.id, fullName: student.fullName,
    studentCode: student.studentCode, grade: student.grade, religion: student.religion,
  });

  res.json({
    token,
    user: { id: student.id, fullName: student.fullName, studentCode: student.studentCode, grade: student.grade, religion: student.religion, subject: null, role: "student" },
  });
});

// ─── Teacher Signup (goes to pending) ────────────────────────────────────────

router.post("/auth/teacher/signup", async (req: Request, res: Response): Promise<void> => {
  const { fullName, email, password, confirmPassword } = req.body;

  if (!fullName || !email || !password) {
    res.status(400).json({ error: "Full name, email, and password are required" });
    return;
  }
  if (password !== confirmPassword) {
    res.status(400).json({ error: "Passwords do not match" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const existing = await db.select().from(teachersTable).where(eq(teachersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "An account with this email already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.insert(teachersTable).values({
    fullName, email, passwordHash,
    accountStatus: "pending",
    isActive: false,
  });

  res.status(201).json({
    message: "Your account request has been submitted. You will be able to sign in once an admin approves your account and assigns your subjects.",
  });
});

// ─── Teacher Signin ───────────────────────────────────────────────────────────

router.post("/auth/teacher/signin", async (req: Request, res: Response): Promise<void> => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const results = await db.select().from(teachersTable).where(
    or(eq(teachersTable.email, identifier), eq(teachersTable.fullName, identifier))
  ).limit(1);

  const teacher = results[0];
  if (!teacher) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (teacher.accountStatus === "pending") {
    res.status(403).json({ error: "Your account is waiting for admin approval." });
    return;
  }
  if (teacher.accountStatus === "rejected") {
    res.status(403).json({ error: "Your account request was rejected. Please contact the administrator." });
    return;
  }
  if (!teacher.isActive) {
    res.status(403).json({ error: "Your account has been disabled. Contact the administrator." });
    return;
  }

  const valid = await bcrypt.compare(password, teacher.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  // Get assigned subjects and grades
  const [subjects, teacherGrades] = await Promise.all([
    db.select().from(teacherSubjectsTable).where(eq(teacherSubjectsTable.teacherId, teacher.id)),
    db.select().from(teacherGradesTable).where(eq(teacherGradesTable.teacherId, teacher.id)),
  ]);
  const subjectList = subjects.map((s) => s.subjectName);
  const gradeList = teacherGrades.map((g) => g.grade);

  await db.insert(activityLogsTable).values({
    userId: teacher.id, userRole: "teacher", userName: teacher.fullName,
    action: "login", details: `Teacher ${teacher.fullName} signed in`,
  });

  const token = signToken({
    role: "teacher", id: teacher.id, fullName: teacher.fullName,
    subject: subjectList[0] ?? "Unassigned",
  });

  res.json({
    token,
    user: {
      id: teacher.id, fullName: teacher.fullName, studentCode: null, grade: null, religion: null,
      subject: subjectList[0] ?? "Unassigned", subjects: subjectList, grades: gradeList, role: "teacher",
    },
  });
});

// ─── Change Password ──────────────────────────────────────────────────────────

router.patch("/auth/password", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user: JwtPayload }).user;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) { res.status(400).json({ error: "Current and new passwords are required" }); return; }
  if (newPassword.length < 6) { res.status(400).json({ error: "New password must be at least 6 characters" }); return; }

  if (user.role === "student") {
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, user.id!)).limit(1);
    if (!student || !(await bcrypt.compare(currentPassword, student.passwordHash))) {
      res.status(401).json({ error: "Current password is incorrect" }); return;
    }
    await db.update(studentsTable).set({ passwordHash: await bcrypt.hash(newPassword, 12) }).where(eq(studentsTable.id, student.id));
  } else if (user.role === "teacher") {
    const [teacher] = await db.select().from(teachersTable).where(eq(teachersTable.id, user.id!)).limit(1);
    if (!teacher || !(await bcrypt.compare(currentPassword, teacher.passwordHash))) {
      res.status(401).json({ error: "Current password is incorrect" }); return;
    }
    await db.update(teachersTable).set({ passwordHash: await bcrypt.hash(newPassword, 12) }).where(eq(teachersTable.id, teacher.id));
  } else {
    res.status(403).json({ error: "Password change not supported for this role" }); return;
  }

  res.json({ message: "Password updated successfully" });
});

// ─── Me ───────────────────────────────────────────────────────────────────────

router.get("/auth/me", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user: JwtPayload }).user;

  if (user.role === "teacher" && user.id) {
    const [subjects, teacherGrades] = await Promise.all([
      db.select().from(teacherSubjectsTable).where(eq(teacherSubjectsTable.teacherId, user.id)),
      db.select().from(teacherGradesTable).where(eq(teacherGradesTable.teacherId, user.id)),
    ]);
    const subjectList = subjects.map((s) => s.subjectName);
    const gradeList = teacherGrades.map((g) => g.grade);
    res.json({
      id: user.id, fullName: user.fullName, studentCode: null, grade: null, religion: null,
      subject: subjectList[0] ?? "Unassigned", subjects: subjectList, grades: gradeList, role: user.role,
    });
    return;
  }

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
