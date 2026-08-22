import { pgTable, text, timestamp, uuid, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const testRunStatusEnum = pgEnum("test_run_status", [
  "pending",
  "running",
  "completed",
  "failed",
]);

export const testRunsTable = pgTable("test_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  url: text("url").notNull(),
  environmentTag: text("environment_tag"),
  status: testRunStatusEnum("status").notNull().default("pending"),
  moduleSelection: text("module_selection").array().notNull(),
  triggeredBy: text("triggered_by"),
  testUsername: text("test_username"),
  testPassword: text("test_password"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTestRunSchema = createInsertSchema(testRunsTable).omit({
  id: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
});

export type InsertTestRun = z.infer<typeof insertTestRunSchema>;
export type TestRun = typeof testRunsTable.$inferSelect;
