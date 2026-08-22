import { pgTable, text, timestamp, uuid, integer, pgEnum, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { testRunsTable } from "./testRuns";

export const testResultStatusEnum = pgEnum("test_result_status", [
  "pass",
  "fail",
  "warning",
  "skipped",
]);

export const testModuleEnum = pgEnum("test_module", [
  "home",
  "login",
  "navigation",
  "search",
  "category",
  "filters",
  "plp",
  "pdp",
  "cart",
  "checkout",
]);

export const testResultsTable = pgTable("test_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id")
    .notNull()
    .references(() => testRunsTable.id, { onDelete: "cascade" }),
  module: testModuleEnum("module").notNull(),
  scenario: text("scenario").notNull(),
  testId: text("test_id").notNull(),
  status: testResultStatusEnum("status").notNull(),
  durationMs: integer("duration_ms"),
  errorMessage: text("error_message"),
  screenshotUrl: text("screenshot_url"),
  apisCalled: json("apis_called").$type<string[]>(),
  productName: text("product_name"),
  productCode: text("product_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTestResultSchema = createInsertSchema(testResultsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertTestResult = z.infer<typeof insertTestResultSchema>;
export type TestResult = typeof testResultsTable.$inferSelect;
