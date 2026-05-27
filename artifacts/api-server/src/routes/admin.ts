import { Router } from "express";
import bcrypt from "bcrypt";
import {
  db, studentsTable, adminsTable, teachersTable, teacherSubjectsTable,
  teacherGradesTable, activityLogsTable,
} from "@workspace/db";
import { eq, desc, count, and, inArray } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth.js";
import type { Request, Response } from "express";
import type { JwtPayload } from "../middlewares/auth.js";

const router = Router();

function getAdmin(req: Request) {
  return (req as Request & { user: JwtPayload }).user;
}

// ─── Overview ─────────────────────────────────────────────────────────────────

router.get("/admin/overview", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const [approvedStudents] = await db.select({ count: count() }).from(studentsTable).where(eq(studentsTable.accountStatus, "approved"));
  const [approvedTeachers] = await db.select({ count: count() }).from(teachersTable).where(eq(teachersTable.accountStatus, "approved"));
  const [pendingStudents] = await db.select({ count: count() }).from(studentsTable).where(eq(studentsTable.accountStatus, "pending"));
  const [pendingTeachers] = await db.select({ count: count() }).from(teachersTable).where(eq(teachersTable.accountStatus, "pending"));
  const recentLogs = await db.select().from(activityLogsTable).orderBy(desc(activityLogsTable.createdAt)).limit(10);

  res.json({
    totalStudents: approvedStudents.count,
    totalTeachers: approvedTeachers.count,
    pendingStudentRequests: pendingStudents.count,
    pendingTeacherRequests: pendingTeachers.count,
    recentActivity: recentLogs,
  });
});

// ─── Student Requests (pending signups) ───────────────────────────────────────

router.get("/admin/student-requests", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const pending = await db.select().from(studentsTable)
    .where(eq(studentsTable.accountStatus, "pending"))
    .orderBy(desc(studentsTable.createdAt));
  res.json(pending);
});

router.post("/admin/student-requests/:id/approve", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const admin = getAdmin(req);

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, id)).limit(1);
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }
  if (student.accountStatus !== "pending") { res.status(400).json({ error: "Already processed" }); return; }

  const studentCode = `STU-${1000 + id}`;

  await db.update(studentsTable)
    .set({ accountStatus: "approved", isActive: true, studentCode })
    .where(eq(studentsTable.id, id));

  await db.insert(activityLogsTable).values({
    userId: admin.id, userRole: "admin", userName: admin.fullName,
    action: "approve_student",
    details: `Approved student ${student.fullName} — Code: ${studentCode}`,
  });

  res.json({ message: "Student approved", studentCode });
});

router.post("/admin/student-requests/:id/reject", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const admin = getAdmin(req);

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, id)).limit(1);
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }

  await db.update(studentsTable).set({ accountStatus: "rejected" }).where(eq(studentsTable.id, id));

  await db.insert(activityLogsTable).values({
    userId: admin.id, userRole: "admin", userName: admin.fullName,
    action: "reject_student", details: `Rejected student signup for ${student.fullName}`,
  });

  res.json({ message: "Student rejected" });
});

// ─── Teacher Requests (pending signups) ───────────────────────────────────────

router.get("/admin/teacher-requests", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const pending = await db.select().from(teachersTable)
    .where(eq(teachersTable.accountStatus, "pending"))
    .orderBy(desc(teachersTable.createdAt));
  res.json(pending);
});

router.post("/admin/teacher-requests/:id/approve", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const admin = getAdmin(req);
  const { subjects, grades } = req.body;

  const [teacher] = await db.select().from(teachersTable).where(eq(teachersTable.id, id)).limit(1);
  if (!teacher) { res.status(404).json({ error: "Teacher not found" }); return; }
  if (teacher.accountStatus !== "pending") { res.status(400).json({ error: "Already processed" }); return; }

  await db.update(teachersTable)
    .set({ accountStatus: "approved", isActive: true })
    .where(eq(teachersTable.id, id));

  if (Array.isArray(subjects) && subjects.length > 0) {
    await db.insert(teacherSubjectsTable).values(
      subjects.map((s: string) => ({ teacherId: id, subjectName: s }))
    );
  }

  if (Array.isArray(grades) && grades.length > 0) {
    await db.insert(teacherGradesTable).values(
      grades.map((g: string) => ({ teacherId: id, grade: g }))
    );
  }

  await db.insert(activityLogsTable).values({
    userId: admin.id, userRole: "admin", userName: admin.fullName,
    action: "approve_teacher",
    details: `Approved teacher ${teacher.fullName} (${teacher.email})${grades?.length ? ` — Grades: ${grades.join(", ")}` : ""}`,
  });

  res.json({ message: "Teacher approved", teacherName: teacher.fullName });
});

router.post("/admin/teacher-requests/:id/reject", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const admin = getAdmin(req);

  const [teacher] = await db.select().from(teachersTable).where(eq(teachersTable.id, id)).limit(1);
  if (!teacher) { res.status(404).json({ error: "Teacher not found" }); return; }

  await db.update(teachersTable).set({ accountStatus: "rejected" }).where(eq(teachersTable.id, id));

  await db.insert(activityLogsTable).values({
    userId: admin.id, userRole: "admin", userName: admin.fullName,
    action: "reject_teacher", details: `Rejected teacher signup for ${teacher.fullName}`,
  });

  res.json({ message: "Teacher rejected" });
});

// ─── Students Management ──────────────────────────────────────────────────────

router.get("/admin/students", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const students = await db.select({
    id: studentsTable.id,
    fullName: studentsTable.fullName,
    studentCode: studentsTable.studentCode,
    email: studentsTable.email,
    grade: studentsTable.grade,
    religion: studentsTable.religion,
    accountStatus: studentsTable.accountStatus,
    isActive: studentsTable.isActive,
    createdAt: studentsTable.createdAt,
  }).from(studentsTable)
    .where(eq(studentsTable.accountStatus, "approved"))
    .orderBy(desc(studentsTable.createdAt));
  res.json(students);
});

router.patch("/admin/students/:id/toggle-active", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const admin = getAdmin(req);

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, id)).limit(1);
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }

  const newStatus = !student.isActive;
  await db.update(studentsTable).set({ isActive: newStatus }).where(eq(studentsTable.id, id));

  await db.insert(activityLogsTable).values({
    userId: admin.id, userRole: "admin", userName: admin.fullName,
    action: newStatus ? "enable_student" : "disable_student",
    details: `${newStatus ? "Enabled" : "Disabled"} student ${student.fullName} (${student.studentCode})`,
  });

  res.json({ message: `Student ${newStatus ? "enabled" : "disabled"}`, isActive: newStatus });
});

router.patch("/admin/students/:id/reset-password", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const admin = getAdmin(req);

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, id)).limit(1);
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }

  const tempPassword = "Learnova2026";
  const passwordHash = await bcrypt.hash(tempPassword, 12);
  await db.update(studentsTable).set({ passwordHash }).where(eq(studentsTable.id, id));

  await db.insert(activityLogsTable).values({
    userId: admin.id, userRole: "admin", userName: admin.fullName,
    action: "reset_password", details: `Reset password for student ${student.fullName}`,
  });

  res.json({ message: "Password reset", tempPassword });
});

router.patch("/admin/students/:id/grade", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { grade } = req.body;
  const admin = getAdmin(req);

  const gradeNum = parseInt(grade, 10);
  if (isNaN(gradeNum) || gradeNum < 1 || gradeNum > 12) { res.status(400).json({ error: "Grade must be 1–12" }); return; }

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, id)).limit(1);
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }

  await db.update(studentsTable).set({ grade: gradeNum }).where(eq(studentsTable.id, id));

  await db.insert(activityLogsTable).values({
    userId: admin.id, userRole: "admin", userName: admin.fullName,
    action: "change_grade", details: `Changed grade for ${student.fullName}: ${student.grade} → ${gradeNum}`,
  });

  res.json({ message: "Grade updated" });
});

router.delete("/admin/students/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const admin = getAdmin(req);

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, id)).limit(1);
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }

  await db.delete(studentsTable).where(eq(studentsTable.id, id));

  await db.insert(activityLogsTable).values({
    userId: admin.id, userRole: "admin", userName: admin.fullName,
    action: "delete_student", details: `Deleted student ${student.fullName} (${student.studentCode})`,
  });

  res.json({ message: "Student deleted" });
});

// ─── Teachers Management ──────────────────────────────────────────────────────

router.get("/admin/teachers", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const teachers = await db.select({
    id: teachersTable.id,
    fullName: teachersTable.fullName,
    email: teachersTable.email,
    accountStatus: teachersTable.accountStatus,
    isActive: teachersTable.isActive,
    createdAt: teachersTable.createdAt,
  }).from(teachersTable)
    .where(eq(teachersTable.accountStatus, "approved"))
    .orderBy(desc(teachersTable.createdAt));

  const teacherIds = teachers.map((t) => t.id);

  const [allSubjects, allGrades] = teacherIds.length > 0
    ? await Promise.all([
        db.select().from(teacherSubjectsTable).where(inArray(teacherSubjectsTable.teacherId, teacherIds)),
        db.select().from(teacherGradesTable).where(inArray(teacherGradesTable.teacherId, teacherIds)),
      ])
    : [[], []];

  const result = teachers.map((t) => ({
    ...t,
    subjects: allSubjects.filter((s) => s.teacherId === t.id).map((s) => s.subjectName),
    grades: allGrades.filter((g) => g.teacherId === t.id).map((g) => g.grade),
  }));

  res.json(result);
});

router.patch("/admin/teachers/:id/toggle-active", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const admin = getAdmin(req);

  const [teacher] = await db.select().from(teachersTable).where(eq(teachersTable.id, id)).limit(1);
  if (!teacher) { res.status(404).json({ error: "Teacher not found" }); return; }

  const newStatus = !teacher.isActive;
  await db.update(teachersTable).set({ isActive: newStatus }).where(eq(teachersTable.id, id));

  await db.insert(activityLogsTable).values({
    userId: admin.id, userRole: "admin", userName: admin.fullName,
    action: newStatus ? "enable_teacher" : "disable_teacher",
    details: `${newStatus ? "Enabled" : "Disabled"} teacher ${teacher.fullName}`,
  });

  res.json({ message: `Teacher ${newStatus ? "enabled" : "disabled"}`, isActive: newStatus });
});

router.put("/admin/teachers/:id/subjects", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const admin = getAdmin(req);
  const { subjects } = req.body;

  if (!Array.isArray(subjects)) { res.status(400).json({ error: "subjects must be an array" }); return; }

  const [teacher] = await db.select().from(teachersTable).where(eq(teachersTable.id, id)).limit(1);
  if (!teacher) { res.status(404).json({ error: "Teacher not found" }); return; }

  await db.delete(teacherSubjectsTable).where(eq(teacherSubjectsTable.teacherId, id));
  if (subjects.length > 0) {
    await db.insert(teacherSubjectsTable).values(subjects.map((s: string) => ({ teacherId: id, subjectName: s })));
  }

  await db.insert(activityLogsTable).values({
    userId: admin.id, userRole: "admin", userName: admin.fullName,
    action: "update_subjects",
    details: `Updated subjects for ${teacher.fullName}: [${subjects.join(", ")}]`,
  });

  res.json({ message: "Subjects updated", subjects });
});

router.put("/admin/teachers/:id/grades", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const admin = getAdmin(req);
  const { grades } = req.body;

  if (!Array.isArray(grades)) { res.status(400).json({ error: "grades must be an array" }); return; }

  const [teacher] = await db.select().from(teachersTable).where(eq(teachersTable.id, id)).limit(1);
  if (!teacher) { res.status(404).json({ error: "Teacher not found" }); return; }

  await db.delete(teacherGradesTable).where(eq(teacherGradesTable.teacherId, id));
  if (grades.length > 0) {
    await db.insert(teacherGradesTable).values(grades.map((g: string) => ({ teacherId: id, grade: g })));
  }

  await db.insert(activityLogsTable).values({
    userId: admin.id, userRole: "admin", userName: admin.fullName,
    action: "update_grades",
    details: `Updated grades for ${teacher.fullName}: [${grades.join(", ")}]`,
  });

  res.json({ message: "Grades updated", grades });
});

router.delete("/admin/teachers/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const admin = getAdmin(req);

  const [teacher] = await db.select().from(teachersTable).where(eq(teachersTable.id, id)).limit(1);
  if (!teacher) { res.status(404).json({ error: "Teacher not found" }); return; }

  await db.delete(teacherSubjectsTable).where(eq(teacherSubjectsTable.teacherId, id));
  await db.delete(teacherGradesTable).where(eq(teacherGradesTable.teacherId, id));
  await db.delete(teachersTable).where(eq(teachersTable.id, id));

  await db.insert(activityLogsTable).values({
    userId: admin.id, userRole: "admin", userName: admin.fullName,
    action: "delete_teacher", details: `Removed teacher ${teacher.fullName}`,
  });

  res.json({ message: "Teacher removed" });
});

// ─── Activity Logs ────────────────────────────────────────────────────────────

router.get("/admin/activity-logs", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const logs = await db.select().from(activityLogsTable).orderBy(desc(activityLogsTable.createdAt)).limit(200);
  res.json(logs);
});

export default router;
