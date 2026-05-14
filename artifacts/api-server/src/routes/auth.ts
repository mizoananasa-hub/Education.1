import { Router } from "express";
import bcrypt from "bcrypt";
import { db, studentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, verifyToken } from "../middlewares/auth.js";
import { requireAuth } from "../middlewares/auth.js";
import type { Request, Response } from "express";
import type { JwtPayload } from "../middlewares/auth.js";

const router = Router();

// Teacher subject passwords — backend only, never exposed
const TEACHER_PASSWORDS: Record<string, string> = {
  "Mathematics": "Math@LMS1",
  "French": "French@LMS2",
  "English": "English@LMS3",
  "Arabic": "Arabic@LMS4",
  "ICT": "ICT@LMS5",
  "Science": "Science@LMS6",
  "Social Studies": "Social@LMS7",
  "Islamic Revision": "Islamic@LMS8",
  "Christian Religion": "Christian@LMS9",
  "Biology": "Bio@LMS10",
  "Physics": "Physics@LMS11",
  "Chemistry": "Chem@LMS12",
};

router.post("/auth/student/signup", async (req: Request, res: Response): Promise<void> => {
  const { fullName, studentCode, password, confirmPassword, grade, religion } = req.body;

  if (!fullName || !studentCode || !password || !confirmPassword || !grade || !religion) {
    res.status(400).json({ error: "All fields are required" });
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

  const existing = await db.select().from(studentsTable).where(eq(studentsTable.studentCode, studentCode)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Student code already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [student] = await db.insert(studentsTable).values({
    fullName,
    studentCode,
    passwordHash,
    grade: gradeNum,
    religion,
  }).returning();

  const token = signToken({
    role: "student",
    id: student.id,
    fullName: student.fullName,
    studentCode: student.studentCode,
    grade: student.grade,
    religion: student.religion,
  });

  res.status(201).json({
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

  const valid = await bcrypt.compare(password, student.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid student code or password" });
    return;
  }

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

router.post("/auth/teacher/signin", async (req: Request, res: Response): Promise<void> => {
  const { fullName, subject, subjectPassword } = req.body;

  if (!fullName || !subject || !subjectPassword) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }

  const expected = TEACHER_PASSWORDS[subject];
  if (!expected || expected !== subjectPassword) {
    res.status(401).json({ error: "Invalid subject or password" });
    return;
  }

  const token = signToken({
    role: "teacher",
    fullName,
    subject,
  });

  res.json({
    token,
    user: {
      id: null,
      fullName,
      studentCode: null,
      grade: null,
      religion: null,
      subject,
      role: "teacher",
    },
  });
});

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
