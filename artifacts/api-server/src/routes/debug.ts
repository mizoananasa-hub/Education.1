import { Router } from "express";
import { db, adminsTable, studentsTable, teachersTable } from "@workspace/db";
import type { Request, Response } from "express";

const router = Router();

router.get("/debug/users", async (_req: Request, res: Response): Promise<void> => {
  const [admins, students, teachers] = await Promise.all([
    db.select({ id: adminsTable.id, username: adminsTable.username, createdAt: adminsTable.createdAt }).from(adminsTable),
    db.select({ id: studentsTable.id, fullName: studentsTable.fullName, studentCode: studentsTable.studentCode, accountStatus: studentsTable.accountStatus }).from(studentsTable).limit(20),
    db.select({ id: teachersTable.id, fullName: teachersTable.fullName, email: teachersTable.email, accountStatus: teachersTable.accountStatus }).from(teachersTable).limit(20),
  ]);
  res.json({ admins, students: students.length, teachers: teachers.length, studentList: students, teacherList: teachers });
});

export default router;
