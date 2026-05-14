import { Router } from "express";
import { db, studentsTable } from "@workspace/db";
import { like, or } from "drizzle-orm";
import { requireTeacher } from "../middlewares/auth.js";
import type { Request, Response } from "express";

const router = Router();

router.get("/students", requireTeacher, async (req: Request, res: Response): Promise<void> => {
  const { search } = req.query;

  let rows;
  if (search && typeof search === "string" && search.trim()) {
    const pattern = `%${search.trim()}%`;
    rows = await db.select({
      id: studentsTable.id,
      fullName: studentsTable.fullName,
      studentCode: studentsTable.studentCode,
      grade: studentsTable.grade,
      religion: studentsTable.religion,
      createdAt: studentsTable.createdAt,
    }).from(studentsTable).where(
      or(
        like(studentsTable.fullName, pattern),
        like(studentsTable.studentCode, pattern),
      )
    );
  } else {
    rows = await db.select({
      id: studentsTable.id,
      fullName: studentsTable.fullName,
      studentCode: studentsTable.studentCode,
      grade: studentsTable.grade,
      religion: studentsTable.religion,
      createdAt: studentsTable.createdAt,
    }).from(studentsTable);
  }

  res.json(rows);
});

export default router;
