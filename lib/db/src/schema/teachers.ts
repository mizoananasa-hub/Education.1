import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";

export const teachersTable = pgTable("teachers", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  accountStatus: text("account_status").notNull().default("pending"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Teacher = typeof teachersTable.$inferSelect;
