import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { notebooksTable } from "./notebooks";

export const noteFilesTable = pgTable("note_files", {
  id: serial("id").primaryKey(),
  notebookId: integer("notebook_id").notNull().references(() => notebooksTable.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  filepath: text("filepath").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertNoteFileSchema = createInsertSchema(noteFilesTable).omit({ id: true, createdAt: true });
export type InsertNoteFile = z.infer<typeof insertNoteFileSchema>;
export type NoteFile = typeof noteFilesTable.$inferSelect;
