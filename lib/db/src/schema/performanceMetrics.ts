import { pgTable, timestamp, uuid, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { testRunsTable } from "./testRuns";

export const pageTypeEnum = pgEnum("page_type", ["home", "plp", "pdp"]);

export const performanceMetricsTable = pgTable("performance_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id")
    .notNull()
    .references(() => testRunsTable.id, { onDelete: "cascade" }),
  pageType: pageTypeEnum("page_type").notNull(),
  ttfbMs: integer("ttfb_ms"),
  fcpMs: integer("fcp_ms"),
  lcpMs: integer("lcp_ms"),
  loadTimeMs: integer("load_time_ms"),
  pageWeightKb: integer("page_weight_kb"),
  networkRequests: integer("network_requests"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPerformanceMetricSchema = createInsertSchema(
  performanceMetricsTable
).omit({ id: true, createdAt: true });

export type InsertPerformanceMetric = z.infer<typeof insertPerformanceMetricSchema>;
export type PerformanceMetric = typeof performanceMetricsTable.$inferSelect;
