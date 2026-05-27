import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const teacherGradesTable = pgTable("teacher_grades", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id").notNull(),
  grade: text("grade").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TeacherGrade = typeof teacherGradesTable.$inferSelect;
