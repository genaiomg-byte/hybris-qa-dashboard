import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, testRunsTable, testResultsTable } from "@workspace/db";
import {
  CreateRunBody,
  GetRunParams,
  DeleteRunParams,
  GetRunResultsParams,
  ListRunsQueryParams,
} from "@workspace/api-zod";
import { requireAuth, requireAllowedUser } from "../middlewares/auth";
import { executeTestRun } from "../lib/testRunner";
import { supabase } from "../lib/supabase";

const router: IRouter = Router();

// Current user access check
router.get("/me", requireAuth, async (req, res): Promise<void> => {
  const email = req.user!.email ?? "";
  const { data } = await supabase
    .from("allowed_users")
    .select("role")
    .eq("email", email)
    .maybeSingle();
  res.json({ email, canCreateRun: !!data });
});

// List runs
router.get("/runs", requireAuth, async (req, res): Promise<void> => {
  const query = ListRunsQueryParams.safeParse(req.query);
  const userId = req.user!.id;
  const limit = query.success ? (query.data.limit ?? 50) : 50;
  const offset = query.success ? (query.data.offset ?? 0) : 0;
  const statusFilter = query.success ? query.data.status : undefined;
  const envFilter = query.success ? query.data.environment : undefined;

  const conditions = [eq(testRunsTable.triggeredBy, userId)];
  if (statusFilter) conditions.push(eq(testRunsTable.status, statusFilter as "pending" | "running" | "completed" | "failed"));
  if (envFilter) conditions.push(eq(testRunsTable.environmentTag, envFilter));

  const runs = await db
    .select()
    .from(testRunsTable)
    .where(and(...conditions))
    .orderBy(desc(testRunsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const enriched = await Promise.all(
    runs.map(async (run) => {
      const results = await db
        .select()
        .from(testResultsTable)
        .where(eq(testResultsTable.runId, run.id));
      const total = results.length;
      const passed = results.filter((r) => r.status === "pass").length;
      const failed = results.filter((r) => r.status === "fail").length;
      return {
        ...run,
        moduleSelection: run.moduleSelection,
        totalScenarios: total || null,
        passedScenarios: total ? passed : null,
        failedScenarios: total ? failed : null,
        passRate: total ? Math.round((passed / total) * 100) : null,
        durationMs:
          run.startedAt && run.completedAt
            ? run.completedAt.getTime() - run.startedAt.getTime()
            : null,
        startedAt: run.startedAt?.toISOString() ?? null,
        completedAt: run.completedAt?.toISOString() ?? null,
        createdAt: run.createdAt.toISOString(),
        environmentTag: run.environmentTag ?? null,
        triggeredBy: run.triggeredBy ?? null,
      };
    })
  );

  res.json(enriched);
});

// Create run
router.post("/runs", requireAuth, requireAllowedUser, async (req, res): Promise<void> => {
  const parsed = CreateRunBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { url, environmentTag, moduleSelection, testUsername, testPassword } = parsed.data;

  const [run] = await db
    .insert(testRunsTable)
    .values({
      url,
      environmentTag: environmentTag ?? null,
      moduleSelection,
      triggeredBy: req.user!.id,
      testUsername: testUsername ?? null,
      testPassword: testPassword ?? null,
    })
    .returning();

  void executeTestRun(run.id).catch((err: unknown) => {
    const log = req.log ?? { error: console.error };
    log.error({ err, runId: run.id }, "Background test run crashed");
  });

  res.status(201).json({
    ...run,
    moduleSelection: run.moduleSelection,
    startedAt: null,
    completedAt: null,
    createdAt: run.createdAt.toISOString(),
    environmentTag: run.environmentTag ?? null,
    triggeredBy: run.triggeredBy ?? null,
    totalScenarios: null,
    passedScenarios: null,
    failedScenarios: null,
    passRate: null,
    durationMs: null,
  });
});

// Compare runs
router.get("/runs/compare", requireAuth, async (req, res): Promise<void> => {
  const { runA, runB } = req.query as { runA?: string; runB?: string };
  if (!runA || !runB) {
    res.status(400).json({ error: "runA and runB query params required" });
    return;
  }

  const [a] = await db.select().from(testRunsTable).where(eq(testRunsTable.id, runA));
  const [b] = await db.select().from(testRunsTable).where(eq(testRunsTable.id, runB));

  if (!a || !b) {
    res.status(400).json({ error: "One or both runs not found" });
    return;
  }

  const [resultsA, resultsB] = await Promise.all([
    db.select().from(testResultsTable).where(eq(testResultsTable.runId, runA)),
    db.select().from(testResultsTable).where(eq(testResultsTable.runId, runB)),
  ]);

  const improvements: string[] = [];
  const regressions: string[] = [];

  const passedA = resultsA.filter((r) => r.status === "pass").length;
  const passedB = resultsB.filter((r) => r.status === "pass").length;
  if (resultsA.length && resultsB.length) {
    const rateA = passedA / resultsA.length;
    const rateB = passedB / resultsB.length;
    if (rateB > rateA) improvements.push(`Pass rate improved from ${Math.round(rateA * 100)}% to ${Math.round(rateB * 100)}%`);
    if (rateB < rateA) regressions.push(`Pass rate dropped from ${Math.round(rateA * 100)}% to ${Math.round(rateB * 100)}%`);
  }

  const formatRun = (r: typeof a) => ({
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

  const formatResult = (r: (typeof resultsA)[0]) => ({
    ...r,
    durationMs: r.durationMs ?? null,
    errorMessage: r.errorMessage ?? null,
    screenshotUrl: r.screenshotUrl ?? null,
    createdAt: r.createdAt.toISOString(),
  });

  res.json({
    runA: formatRun(a),
    runB: formatRun(b),
    resultsA: resultsA.map(formatResult),
    resultsB: resultsB.map(formatResult),
    improvements,
    regressions,
  });
});

// Get single run
router.get("/runs/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetRunParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [run] = await db
    .select()
    .from(testRunsTable)
    .where(eq(testRunsTable.id, params.data.id));

  if (!run) {
    res.status(404).json({ error: "Run not found" });
    return;
  }

  const results = await db
    .select()
    .from(testResultsTable)
    .where(eq(testResultsTable.runId, run.id));

  const total = results.length;
  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;

  res.json({
    ...run,
    moduleSelection: run.moduleSelection,
    totalScenarios: total || null,
    passedScenarios: total ? passed : null,
    failedScenarios: total ? failed : null,
    passRate: total ? Math.round((passed / total) * 100) : null,
    durationMs:
      run.startedAt && run.completedAt
        ? run.completedAt.getTime() - run.startedAt.getTime()
        : null,
    startedAt: run.startedAt?.toISOString() ?? null,
    completedAt: run.completedAt?.toISOString() ?? null,
    createdAt: run.createdAt.toISOString(),
    environmentTag: run.environmentTag ?? null,
    triggeredBy: run.triggeredBy ?? null,
  });
});

// Delete run
router.delete("/runs/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteRunParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [run] = await db
    .delete(testRunsTable)
    .where(
      and(
        eq(testRunsTable.id, params.data.id),
        eq(testRunsTable.triggeredBy, req.user!.id)
      )
    )
    .returning();

  if (!run) {
    res.status(404).json({ error: "Run not found" });
    return;
  }

  res.sendStatus(204);
});

// Get run results
router.get("/runs/:id/results", requireAuth, async (req, res): Promise<void> => {
  const params = GetRunResultsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const results = await db
    .select()
    .from(testResultsTable)
    .where(eq(testResultsTable.runId, params.data.id))
    .orderBy(testResultsTable.module, testResultsTable.createdAt);

  if (!results.length) {
    const [run] = await db.select().from(testRunsTable).where(eq(testRunsTable.id, params.data.id));
    if (!run) {
      res.status(404).json({ error: "Run not found" });
      return;
    }
  }

  res.json(
    results.map((r) => ({
      ...r,
      durationMs: r.durationMs ?? null,
      errorMessage: r.errorMessage ?? null,
      screenshotUrl: r.screenshotUrl ?? null,
      apisCalled: (r.apisCalled as string[] | null) ?? [],
      productName: r.productName ?? null,
      productCode: r.productCode ?? null,
      createdAt: r.createdAt.toISOString(),
    }))
  );
});

export default router;
