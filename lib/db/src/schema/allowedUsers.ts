import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const allowedUsersTable = pgTable("allowed_users", {
  email:     text("email").primaryKey(),
  role:      text("role").notNull().default("viewer"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});