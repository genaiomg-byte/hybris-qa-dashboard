import { Router, type IRouter } from "express";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { db, testRunsTable, testResultsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.id;

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const [allRunsResult, weekRunsResult, recentRuns] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(testRunsTable)
      .where(eq(testRunsTable.triggeredBy, userId)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(testRunsTable)
      .where(
        and(
          eq(testRunsTable.triggeredBy, userId),
          gte(testRunsTable.createdAt, oneWeekAgo)
        )
      ),
    db
      .select()
      .from(testRunsTable)
      .where(eq(testRunsTable.triggeredBy, userId))
      .orderBy(desc(testRunsTable.createdAt))
      .limit(5),
  ]);

  const totalRuns = Number(allRunsResult[0]?.count ?? 0);
  const totalRunsThisWeek = Number(weekRunsResult[0]?.count ?? 0);

  const completedRunIds = recentRuns
    .filter((r) => r.status === "completed")
    .map((r) => r.id);

  let overallPassRate = 0;
  let averageDurationMs: number | null = null;

  if (completedRunIds.length) {
    const results = await db
      .select()
      .from(testResultsTable)
      .where(
        sql`${testResultsTable.runId} = ANY(ARRAY[${sql.join(completedRunIds.map(id => sql`${id}::uuid`), sql`, `)}]::uuid[])`
      );
    const total = results.length;
    const passed = results.filter((r) => r.status === "pass").length;
    overallPassRate = total ? Math.round((passed / total) * 100) : 0;

    const durations = recentRuns
      .filter((r) => r.startedAt && r.completedAt)
      .map((r) => r.completedAt!.getTime() - r.startedAt!.getTime());
    averageDurationMs = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;
  }

  const allRecentRunIds = recentRuns.map((r) => r.id);
  let moduleBreakdown: Array<{
    module: string;
    passRate: number;
    totalScenarios: number;
    passedScenarios: number;
    failedScenarios: number;
  }> = [];

  if (allRecentRunIds.length) {
    const allResults = await db
      .select()
      .from(testResultsTable)
      .where(
        sql`${testResultsTable.runId} = ANY(ARRAY[${sql.join(allRecentRunIds.map(id => sql`${id}::uuid`), sql`, `)}]::uuid[])`
      );

    const byModule = new Map<string, { total: number; passed: number; failed: number }>();
    for (const r of allResults) {
      const m = byModule.get(r.module) ?? { total: 0, passed: 0, failed: 0 };
      m.total++;
      if (r.status === "pass") m.passed++;
      if (r.status === "fail") m.failed++;
      byModule.set(r.module, m);
    }

    moduleBreakdown = Array.from(byModule.entries()).map(([mod, data]) => ({
      module: mod,
      passRate: Math.round((data.passed / data.total) * 100),
      totalScenarios: data.total,
      passedScenarios: data.passed,
      failedScenarios: data.failed,
    }));
  }

  const formatRun = (r: typeof recentRuns[0]) => ({
    ...r,
    moduleSelection: r.moduleSelection,
    startedAt: r.startedAt?.toISOString() ?? null,
    completedAt: r.completedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    environmentTag: r.environmentTag ?? null,
    triggeredBy: r.triggeredBy ?? null,
    totalScenarios: null,
    passedScenarios: null,
    failedScenarios: null,
    passRate: null,
    durationMs: null,
  });

  res.json({
    totalRuns,
    totalRunsThisWeek,
    overallPassRate,
    averageDurationMs,
    recentRuns: recentRuns.map(formatRun),
    moduleBreakdown,
  });
});

export default router;
