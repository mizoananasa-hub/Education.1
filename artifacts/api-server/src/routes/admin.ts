import { Router } from "express";
import bcrypt from "bcrypt";
import { db, studentsTable, adminsTable, studentRequestsTable, teacherRequestsTable, activityLogsTable, notificationsTable } from "@workspace/db";
import { eq, desc, count, and } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth.js";
import type { Request, Response } from "express";
import type { JwtPayload } from "../middlewares/auth.js";

const router = Router();

function getAdmin(req: Request) {
  return (req as Request & { user: JwtPayload }).user;
}

// ─── Overview Stats ───────────────────────────────────────────────────────────

router.get("/admin/overview", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const [studentCount] = await db.select({ count: count() }).from(studentsTable);
  const [teacherCount] = await db.select({ count: count() }).from(teacherRequestsTable).where(eq(teacherRequestsTable.status, "approved"));
  const [pendingStudents] = await db.select({ count: count() }).from(studentRequestsTable).where(eq(studentRequestsTable.status, "pending"));
  const [pendingTeachers] = await db.select({ count: count() }).from(teacherRequestsTable).where(eq(teacherRequestsTable.status, "pending"));
  const recentLogs = await db.select().from(activityLogsTable).orderBy(desc(activityLogsTable.createdAt)).limit(10);

  res.json({
    totalStudents: studentCount.count,
    totalTeachers: teacherCount.count,
    pendingStudentRequests: pendingStudents.count,
    pendingTeacherRequests: pendingTeachers.count,
    recentActivity: recentLogs,
  });
});

// ─── Student Requests ─────────────────────────────────────────────────────────

router.get("/admin/student-requests", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const requests = await db.select().from(studentRequestsTable).orderBy(desc(studentRequestsTable.createdAt));
  res.json(requests);
});

router.post("/admin/student-requests/:id/approve", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const admin = getAdmin(req);

  const [request] = await db.select().from(studentRequestsTable).where(eq(studentRequestsTable.id, id)).limit(1);
  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  if (request.status !== "pending") {
    res.status(400).json({ error: "Request already processed" });
    return;
  }

  // Generate student code and temp password
  const studentCode = `STU-${1000 + id}`;
  const tempPassword = "Learnova2026";
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const gradeNum = parseInt(request.grade, 10);

  const [student] = await db.insert(studentsTable).values({
    fullName: request.fullName,
    studentCode,
    passwordHash,
    grade: gradeNum,
    religion: request.religion,
    isActive: true,
  }).returning();

  await db.update(studentRequestsTable).set({ status: "approved" }).where(eq(studentRequestsTable.id, id));

  await db.insert(activityLogsTable).values({
    userId: admin.id,
    userRole: "admin",
    userName: admin.fullName,
    action: "approve_student",
    details: `Approved student request for ${request.fullName} — Code: ${studentCode}`,
  });

  res.json({
    message: "Student approved",
    studentCode,
    tempPassword,
    student,
  });
});

router.post("/admin/student-requests/:id/reject", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const admin = getAdmin(req);

  const [request] = await db.select().from(studentRequestsTable).where(eq(studentRequestsTable.id, id)).limit(1);
  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  await db.update(studentRequestsTable).set({ status: "rejected" }).where(eq(studentRequestsTable.id, id));

  await db.insert(activityLogsTable).values({
    userId: admin.id,
    userRole: "admin",
    userName: admin.fullName,
    action: "reject_student",
    details: `Rejected student request for ${request.fullName}`,
  });

  res.json({ message: "Student request rejected" });
});

// ─── Teacher Requests ─────────────────────────────────────────────────────────

router.get("/admin/teacher-requests", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const requests = await db.select().from(teacherRequestsTable).orderBy(desc(teacherRequestsTable.createdAt));
  res.json(requests);
});

router.post("/admin/teacher-requests/:id/approve", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const admin = getAdmin(req);
  const { subjectPassword } = req.body;

  if (!subjectPassword) {
    res.status(400).json({ error: "A subject password is required to approve the teacher" });
    return;
  }

  const [request] = await db.select().from(teacherRequestsTable).where(eq(teacherRequestsTable.id, id)).limit(1);
  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  if (request.status !== "pending") {
    res.status(400).json({ error: "Request already processed" });
    return;
  }

  const passwordHash = await bcrypt.hash(subjectPassword, 12);

  await db.update(teacherRequestsTable)
    .set({ status: "approved", passwordHash } as any)
    .where(eq(teacherRequestsTable.id, id));

  await db.insert(activityLogsTable).values({
    userId: admin.id,
    userRole: "admin",
    userName: admin.fullName,
    action: "approve_teacher",
    details: `Approved teacher request for ${request.fullName} (${request.subject})`,
  });

  res.json({ message: "Teacher approved", teacherName: request.fullName, subject: request.subject });
});

router.post("/admin/teacher-requests/:id/reject", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const admin = getAdmin(req);

  const [request] = await db.select().from(teacherRequestsTable).where(eq(teacherRequestsTable.id, id)).limit(1);
  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  await db.update(teacherRequestsTable).set({ status: "rejected" }).where(eq(teacherRequestsTable.id, id));

  await db.insert(activityLogsTable).values({
    userId: admin.id,
    userRole: "admin",
    userName: admin.fullName,
    action: "reject_teacher",
    details: `Rejected teacher request for ${request.fullName} (${request.subject})`,
  });

  res.json({ message: "Teacher request rejected" });
});

// ─── Students Management ──────────────────────────────────────────────────────

router.get("/admin/students", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const students = await db.select({
    id: studentsTable.id,
    fullName: studentsTable.fullName,
    studentCode: studentsTable.studentCode,
    grade: studentsTable.grade,
    religion: studentsTable.religion,
    isActive: studentsTable.isActive,
    createdAt: studentsTable.createdAt,
  }).from(studentsTable).orderBy(desc(studentsTable.createdAt));
  res.json(students);
});

router.patch("/admin/students/:id/toggle-active", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const admin = getAdmin(req);

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, id)).limit(1);
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const newStatus = !student.isActive;
  await db.update(studentsTable).set({ isActive: newStatus }).where(eq(studentsTable.id, id));

  await db.insert(activityLogsTable).values({
    userId: admin.id,
    userRole: "admin",
    userName: admin.fullName,
    action: newStatus ? "enable_student" : "disable_student",
    details: `${newStatus ? "Enabled" : "Disabled"} student ${student.fullName} (${student.studentCode})`,
  });

  res.json({ message: `Student ${newStatus ? "enabled" : "disabled"}`, isActive: newStatus });
});

router.patch("/admin/students/:id/reset-password", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const admin = getAdmin(req);

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, id)).limit(1);
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const tempPassword = "Learnova2026";
  const passwordHash = await bcrypt.hash(tempPassword, 12);
  await db.update(studentsTable).set({ passwordHash }).where(eq(studentsTable.id, id));

  await db.insert(activityLogsTable).values({
    userId: admin.id,
    userRole: "admin",
    userName: admin.fullName,
    action: "reset_password",
    details: `Reset password for student ${student.fullName} (${student.studentCode})`,
  });

  res.json({ message: "Password reset to Learnova2026", tempPassword });
});

router.patch("/admin/students/:id/grade", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { grade } = req.body;
  const admin = getAdmin(req);

  const gradeNum = parseInt(grade, 10);
  if (isNaN(gradeNum) || gradeNum < 1 || gradeNum > 12) {
    res.status(400).json({ error: "Grade must be between 1 and 12" });
    return;
  }

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, id)).limit(1);
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  await db.update(studentsTable).set({ grade: gradeNum }).where(eq(studentsTable.id, id));

  await db.insert(activityLogsTable).values({
    userId: admin.id,
    userRole: "admin",
    userName: admin.fullName,
    action: "change_grade",
    details: `Changed grade for ${student.fullName} from ${student.grade} to ${gradeNum}`,
  });

  res.json({ message: "Grade updated" });
});

router.delete("/admin/students/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const admin = getAdmin(req);

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, id)).limit(1);
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  await db.delete(studentsTable).where(eq(studentsTable.id, id));

  await db.insert(activityLogsTable).values({
    userId: admin.id,
    userRole: "admin",
    userName: admin.fullName,
    action: "delete_student",
    details: `Deleted student ${student.fullName} (${student.studentCode})`,
  });

  res.json({ message: "Student deleted" });
});

// ─── Teachers Management ──────────────────────────────────────────────────────

router.get("/admin/teachers", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const teachers = await db.select().from(teacherRequestsTable)
    .where(eq(teacherRequestsTable.status, "approved"))
    .orderBy(desc(teacherRequestsTable.createdAt));
  res.json(teachers);
});

router.patch("/admin/teachers/:id/toggle-active", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const admin = getAdmin(req);

  const [teacher] = await db.select().from(teacherRequestsTable).where(eq(teacherRequestsTable.id, id)).limit(1);
  if (!teacher) {
    res.status(404).json({ error: "Teacher not found" });
    return;
  }

  const newStatus = teacher.status === "approved" ? "disabled" : "approved";
  await db.update(teacherRequestsTable).set({ status: newStatus }).where(eq(teacherRequestsTable.id, id));

  await db.insert(activityLogsTable).values({
    userId: admin.id,
    userRole: "admin",
    userName: admin.fullName,
    action: newStatus === "approved" ? "enable_teacher" : "disable_teacher",
    details: `${newStatus === "approved" ? "Enabled" : "Disabled"} teacher ${teacher.fullName} (${teacher.subject})`,
  });

  res.json({ message: `Teacher ${newStatus === "approved" ? "enabled" : "disabled"}`, status: newStatus });
});

router.patch("/admin/teachers/:id/subject", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { subject } = req.body;
  const admin = getAdmin(req);

  if (!subject) {
    res.status(400).json({ error: "Subject is required" });
    return;
  }

  const [teacher] = await db.select().from(teacherRequestsTable).where(eq(teacherRequestsTable.id, id)).limit(1);
  if (!teacher) {
    res.status(404).json({ error: "Teacher not found" });
    return;
  }

  await db.update(teacherRequestsTable).set({ subject }).where(eq(teacherRequestsTable.id, id));

  await db.insert(activityLogsTable).values({
    userId: admin.id,
    userRole: "admin",
    userName: admin.fullName,
    action: "change_subject",
    details: `Changed subject for ${teacher.fullName} from ${teacher.subject} to ${subject}`,
  });

  res.json({ message: "Subject updated" });
});

router.delete("/admin/teachers/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const admin = getAdmin(req);

  const [teacher] = await db.select().from(teacherRequestsTable).where(eq(teacherRequestsTable.id, id)).limit(1);
  if (!teacher) {
    res.status(404).json({ error: "Teacher not found" });
    return;
  }

  await db.delete(teacherRequestsTable).where(eq(teacherRequestsTable.id, id));

  await db.insert(activityLogsTable).values({
    userId: admin.id,
    userRole: "admin",
    userName: admin.fullName,
    action: "delete_teacher",
    details: `Removed teacher ${teacher.fullName} (${teacher.subject})`,
  });

  res.json({ message: "Teacher removed" });
});

// ─── Activity Logs ────────────────────────────────────────────────────────────

router.get("/admin/activity-logs", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const logs = await db.select().from(activityLogsTable).orderBy(desc(activityLogsTable.createdAt)).limit(200);
  res.json(logs);
});

export default router;
