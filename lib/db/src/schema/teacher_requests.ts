import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const teacherRequestsTable = pgTable("teacher_requests", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  subject: text("subject").notNull(),
  email: text("email"),
  status: text("status").notNull().default("pending"),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TeacherRequest = typeof teacherRequestsTable.$inferSelect;
