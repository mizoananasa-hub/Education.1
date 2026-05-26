import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const teacherSubjectsTable = pgTable("teacher_subjects", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id").notNull(),
  subjectName: text("subject_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TeacherSubject = typeof teacherSubjectsTable.$inferSelect;
