import { useState } from "react";
import { useParams } from "wouter";
import {
  useGetRun,
  useGetRunResults,
  TestResultStatus,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Clock,
  Link2,
  Package,
  BarChart3,
  ListChecks,
  FileText,
  Globe,
  Zap,
} from "lucide-react";
import { formatDuration, formatDate, getStatusColor } from "@/lib/formatters";

// ── Types ─────────────────────────────────────────────────────────────────────
type Tab = "overview" | "scenarios" | "report";

const METHOD_COLOR: Record<string, string> = {
  GET:    "text-sky-400 bg-sky-500/10 border-sky-500/20",
  POST:   "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  PATCH:  "text-amber-400 bg-amber-500/10 border-amber-500/20",
  DELETE: "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

const MODULE_LABEL: Record<string, string> = {
  home: "Home", navigation: "Navigation", search: "Search",
  category: "Category", filters: "Filters", plp: "Product List (PLP)",
  pdp: "Product Detail (PDP)", cart: "Cart",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function StatusIcon({ status }: { status: TestResultStatus }) {
  switch (status) {
    case "pass":    return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
    case "fail":    return <XCircle      className="w-4 h-4 text-rose-500 shrink-0" />;
    case "warning": return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
    default:        return <Info          className="w-4 h-4 text-slate-500 shrink-0" />;
  }
}

function ApiChip({ call }: { call: string }) {
  const [method, ...rest] = call.split(" ");
  const path = rest.join(" ");
  const colors = METHOD_COLOR[method] ?? "text-slate-400 bg-slate-500/10 border-slate-500/20";
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] border rounded px-2 py-0.5 mr-1 mb-1">
      <span className={`font-bold text-[10px] px-1 py-0.5 rounded border ${colors}`}>{method}</span>
      <span className="text-muted-foreground truncate max-w-[280px]">{path}</span>
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pass:    "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    fail:    "bg-rose-500/15 text-rose-400 border-rose-500/30",
    warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    skipped: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded border ${map[status] ?? map.skipped}`}>
      {status.toUpperCase()}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RunDetail() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("overview");

  const { data: run,     isLoading: loadingRun }     = useGetRun(id,         { query: { enabled: !!id } });
  const { data: results, isLoading: loadingResults } = useGetRunResults(id,   { query: { enabled: !!id } });

  if (loadingRun) return <Skeleton className="h-64 w-full rounded-lg" />;
  if (!run)       return <div className="text-center py-20 text-rose-500">Run not found.</div>;

  // ── Derived data ────────────────────────────────────────────────────────────
  const grouped = (results ?? []).reduce<Record<string, typeof results>>((acc, r) => {
    (acc[r.module] ??= []).push(r);
    return acc;
  }, {});

  // All unique APIs called across the run (deduplicated)
  const allApis = [...new Set((results ?? []).flatMap(r => (r as any).apisCalled ?? []))];

  // Product under test — take from first result that has productName
  const productResult = (results ?? []).find(r => (r as any).productName);
  const productName = (productResult as any)?.productName as string | null;
  const productCode = (productResult as any)?.productCode as string | null;

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "overview",  label: "Overview",          icon: BarChart3  },
    { key: "scenarios", label: "Scenarios & APIs",  icon: ListChecks },
    { key: "report",    label: "Validation Report", icon: FileText   },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Card className="border-t-4 border-t-primary">
        <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant={getStatusColor(run.status)} className="px-3 py-1 text-sm uppercase tracking-wider">
                {run.status}
              </Badge>
              <h2 className="text-2xl font-bold tracking-tight break-all">{run.url}</h2>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><Clock  className="w-4 h-4" /> {formatDate(run.startedAt || run.createdAt)}</span>
              <span className="flex items-center gap-1"><Link2  className="w-4 h-4" /> {run.environmentTag || "default"} env</span>
              <span className="flex items-center gap-1"><Globe  className="w-4 h-4" /> {run.moduleSelection.length} modules</span>
              <span className="flex items-center gap-1"><Zap    className="w-4 h-4" /> {allApis.length} unique APIs hit</span>
            </div>
          </div>
          <div className="flex items-center gap-8 shrink-0">
            <div className="flex flex-col items-end">
              <span className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Pass Rate</span>
              <span className={`text-4xl font-black ${run.passRate && run.passRate >= 90 ? "text-emerald-500" : run.passRate && run.passRate >= 75 ? "text-amber-500" : "text-rose-500"}`}>
                {run.passRate != null ? `${run.passRate.toFixed(1)}%` : "—"}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Duration</span>
              <span className="text-4xl font-black">{formatDuration(run.durationMs)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tab bar ────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1 — OVERVIEW
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Scenarios", value: run.totalScenarios ?? 0,   color: "text-foreground" },
              { label: "Passed",          value: run.passedScenarios ?? 0,  color: "text-emerald-500" },
              { label: "Failed",          value: run.failedScenarios ?? 0,  color: "text-rose-500" },
              { label: "APIs Exercised",  value: allApis.length,            color: "text-sky-400" },
            ].map(k => (
              <Card key={k.label} className="bg-card/50">
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">{k.label}</p>
                  <p className={`text-3xl font-black ${k.color}`}>{k.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Module health */}
          <Card>
            <CardHeader><CardTitle>Module Health</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              {loadingResults ? (
                [...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 rounded" />)
              ) : (
                Object.entries(grouped).map(([mod, modResults]) => {
                  const pass = modResults.filter(r => r.status === "pass").length;
                  const fail = modResults.filter(r => r.status === "fail").length;
                  const warn = modResults.filter(r => r.status === "warning").length;
                  const rate = modResults.length ? Math.round((pass / modResults.length) * 100) : 0;
                  return (
                    <div key={mod} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{MODULE_LABEL[mod] ?? mod}</span>
                          <span className="text-xs text-muted-foreground font-mono">{modResults.length} scenarios</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-emerald-400">{pass} pass</span>
                          {warn > 0 && <span className="text-amber-400">{warn} warn</span>}
                          {fail > 0 && <span className="text-rose-400">{fail} fail</span>}
                          <span className="font-semibold text-foreground w-10 text-right">{rate}%</span>
                        </div>
                      </div>
                      <Progress value={rate} className="h-2" />
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* All APIs called */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-sky-400" /> All APIs Called ({allApis.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingResults ? (
                <Skeleton className="h-24 rounded" />
              ) : allApis.length === 0 ? (
                <p className="text-sm text-muted-foreground">No API data available.</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {allApis.map((api, i) => <ApiChip key={i} call={api} />)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2 — SCENARIOS & APIs
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "scenarios" && (
        <div className="space-y-4">
          {loadingResults ? (
            <Skeleton className="h-64 rounded-lg" />
          ) : !results || results.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">No scenario results available.</div>
          ) : (
            <Accordion type="multiple" defaultValue={Object.keys(grouped)} className="space-y-3">
              {Object.entries(grouped).map(([mod, modResults]) => {
                const pass = modResults.filter(r => r.status === "pass").length;
                const modApis = [...new Set(modResults.flatMap(r => (r as any).apisCalled ?? []))];
                return (
                  <AccordionItem key={mod} value={mod} className="border border-border rounded-xl bg-card overflow-hidden">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-accent/40 data-[state=open]:bg-accent/40">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-base">{MODULE_LABEL[mod] ?? mod}</span>
                          <span className="text-xs text-muted-foreground font-mono hidden sm:block">{modApis.length} APIs</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">{pass}/{modResults.length} passed</span>
                          {pass === modResults.length
                            ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            : <XCircle      className="w-5 h-5 text-rose-500" />}
                        </div>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="border-t border-border p-0">
                      {/* APIs called by this module */}
                      {modApis.length > 0 && (
                        <div className="px-6 py-3 bg-muted/30 border-b border-border">
                          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                            APIs Called — {mod}
                          </p>
                          <div className="flex flex-wrap">
                            {modApis.map((api, i) => <ApiChip key={i} call={api} />)}
                          </div>
                        </div>
                      )}

                      {/* Scenario rows */}
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="w-10 pl-6" />
                            <TableHead className="text-xs">Test ID</TableHead>
                            <TableHead className="text-xs">Scenario</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-xs text-right">Duration</TableHead>
                            <TableHead className="text-xs">APIs for scenario</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {modResults.map(res => {
                            const scenarioApis: string[] = (res as any).apisCalled ?? [];
                            return (
                              <TableRow key={res.id} className="border-border hover:bg-accent/20 align-top">
                                <TableCell className="pl-6 pt-3">
                                  <StatusIcon status={res.status} />
                                </TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground pt-3 whitespace-nowrap">
                                  {res.testId}
                                </TableCell>
                                <TableCell className="text-sm pt-3 max-w-[260px]">
                                  <p>{res.scenario}</p>
                                  {res.errorMessage && (
                                    <p className="text-xs text-rose-400 mt-1 bg-rose-500/10 px-2 py-1 rounded">{res.errorMessage}</p>
                                  )}
                                </TableCell>
                                <TableCell className="pt-3">
                                  <StatusBadge status={res.status} />
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs text-muted-foreground pt-3 whitespace-nowrap">
                                  {formatDuration(res.durationMs)}
                                </TableCell>
                                <TableCell className="pt-3 max-w-[300px]">
                                  <div className="flex flex-wrap">
                                    {scenarioApis.map((api, i) => <ApiChip key={i} call={api} />)}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3 — VALIDATION REPORT
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "report" && (
        <div className="space-y-6">
          {/* Product under test */}
          <Card className="border border-primary/30 bg-primary/5">
            <CardContent className="p-6 flex items-start gap-5">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Product Under Test</p>
                {productName ? (
                  <>
                    <p className="text-xl font-bold text-foreground">{productName}</p>
                    <div className="flex items-center gap-3 flex-wrap mt-1">
                      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">SKU / Product Code:</span>
                        <code className="font-mono text-primary bg-primary/10 px-2 py-0.5 rounded text-sm">{productCode}</code>
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      This product was used as the reference item across all product-specific test scenarios (Search, PLP, PDP, Cart).
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No product-specific scenarios were run in this test suite.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Per-module validation table */}
          <Card>
            <CardHeader>
              <CardTitle>Module-by-Module Validation Summary</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Detailed breakdown of what was validated in each module, the APIs exercised, and whether the product reference was involved.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {loadingResults ? (
                <div className="p-6"><Skeleton className="h-64 rounded" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="pl-6 text-xs">Module</TableHead>
                      <TableHead className="text-xs">Scenarios Tested</TableHead>
                      <TableHead className="text-xs">APIs Called</TableHead>
                      <TableHead className="text-xs">Product Validated</TableHead>
                      <TableHead className="text-xs text-right pr-6">Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(grouped).map(([mod, modResults]) => {
                      const pass    = modResults.filter(r => r.status === "pass").length;
                      const fail    = modResults.filter(r => r.status === "fail").length;
                      const warn    = modResults.filter(r => r.status === "warning").length;
                      const rate    = modResults.length ? Math.round((pass / modResults.length) * 100) : 0;
                      const modApis = [...new Set(modResults.flatMap(r => (r as any).apisCalled ?? []))];
                      const hasProduct = modResults.some(r => (r as any).productName);

                      return (
                        <TableRow key={mod} className="border-border hover:bg-accent/20 align-top">
                          <TableCell className="pl-6 pt-4 font-semibold whitespace-nowrap">
                            {MODULE_LABEL[mod] ?? mod}
                          </TableCell>

                          {/* Scenario list */}
                          <TableCell className="pt-4 max-w-[260px]">
                            <ul className="space-y-1.5">
                              {modResults.map(r => (
                                <li key={r.id} className="flex items-start gap-1.5 text-xs leading-relaxed">
                                  <StatusIcon status={r.status} />
                                  <span className={r.status === "fail" ? "text-rose-400" : r.status === "warning" ? "text-amber-400" : "text-foreground/80"}>
                                    {r.scenario}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </TableCell>

                          {/* APIs */}
                          <TableCell className="pt-4 max-w-[280px]">
                            <div className="flex flex-wrap">
                              {modApis.map((api, i) => <ApiChip key={i} call={api} />)}
                            </div>
                          </TableCell>

                          {/* Product */}
                          <TableCell className="pt-4">
                            {hasProduct ? (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-foreground">{productName}</p>
                                <code className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">{productCode}</code>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          {/* Result summary */}
                          <TableCell className="pt-4 pr-6 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className={`text-lg font-bold ${rate >= 90 ? "text-emerald-500" : rate >= 75 ? "text-amber-500" : "text-rose-500"}`}>
                                {rate}%
                              </span>
                              <div className="flex gap-1.5 text-xs">
                                <span className="text-emerald-400">{pass}✓</span>
                                {warn > 0 && <span className="text-amber-400">{warn}⚠</span>}
                                {fail > 0 && <span className="text-rose-400">{fail}✗</span>}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Full API inventory */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-sky-400" /> Complete API Inventory
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                All {allApis.length} unique API endpoints exercised during this test run.
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-xs">#</TableHead>
                    <TableHead className="text-xs">Method</TableHead>
                    <TableHead className="text-xs">Endpoint</TableHead>
                    <TableHead className="text-xs">Called by Module(s)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allApis.map((api, idx) => {
                    const [method, ...rest] = api.split(" ");
                    const path = rest.join(" ");
                    const colors = METHOD_COLOR[method] ?? METHOD_COLOR.GET;
                    const calledBy = Object.entries(grouped)
                      .filter(([, rs]) => rs.some(r => ((r as any).apisCalled ?? []).includes(api)))
                      .map(([m]) => MODULE_LABEL[m] ?? m);
                    return (
                      <TableRow key={idx} className="border-border hover:bg-accent/20">
                        <TableCell className="text-xs text-muted-foreground font-mono w-8">{idx + 1}</TableCell>
                        <TableCell className="w-20">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${colors}`}>{method}</span>
                        </TableCell>
                        <TableCell className="font-mono text-xs break-all">{path}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{calledBy.join(", ")}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
