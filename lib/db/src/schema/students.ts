import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const studentsTable = pgTable("students", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  studentCode: text("student_code").notNull().unique(),
  email: text("email"),
  passwordHash: text("password_hash").notNull(),
  grade: integer("grade").notNull(),
  religion: text("religion").notNull(),
  accountStatus: text("account_status").notNull().default("pending"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStudentSchema = createInsertSchema(studentsTable).omit({ id: true, createdAt: true });
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof studentsTable.$inferSelect;
