import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const studentRequestsTable = pgTable("student_requests", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  grade: text("grade").notNull(),
  religion: text("religion").notNull(),
  parentContact: text("parent_contact"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type StudentRequest = typeof studentRequestsTable.$inferSelect;
