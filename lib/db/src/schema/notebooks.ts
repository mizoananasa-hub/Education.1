import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";

export const notebooksTable = pgTable("notebooks", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id),
  subject: text("subject").notNull(),
  notebookName: text("notebook_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertNotebookSchema = createInsertSchema(notebooksTable).omit({ id: true, createdAt: true });
export type InsertNotebook = z.infer<typeof insertNotebookSchema>;
export type Notebook = typeof notebooksTable.$inferSelect;
