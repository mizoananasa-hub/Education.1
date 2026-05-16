import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const homeworksTable = pgTable("homeworks", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  teacherName: text("teacher_name").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
  timeLimitMinutes: integer("time_limit_minutes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const homeworkQuestionsTable = pgTable("homework_questions", {
  id: serial("id").primaryKey(),
  homeworkId: integer("homework_id").notNull(),
  questionText: text("question_text").notNull(),
  questionType: text("question_type").notNull(),
  gradingMode: text("grading_mode").notNull().default("auto"),
  options: text("options"),
  correctAnswer: text("correct_answer"),
  points: integer("points").notNull().default(1),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const homeworkSubmissionsTable = pgTable("homework_submissions", {
  id: serial("id").primaryKey(),
  homeworkId: integer("homework_id").notNull(),
  studentId: integer("student_id").notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  totalScore: integer("total_score").default(0),
  maxScore: integer("max_score").default(0),
  percentage: integer("percentage").default(0),
  status: text("status").notNull().default("submitted"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const homeworkAnswersTable = pgTable("homework_answers", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull(),
  questionId: integer("question_id").notNull(),
  answer: text("answer"),
  autoScore: integer("auto_score"),
  manualScore: integer("manual_score"),
  teacherFeedback: text("teacher_feedback"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Homework = typeof homeworksTable.$inferSelect;
export type HomeworkQuestion = typeof homeworkQuestionsTable.$inferSelect;
export type HomeworkSubmission = typeof homeworkSubmissionsTable.$inferSelect;
export type HomeworkAnswer = typeof homeworkAnswersTable.$inferSelect;
