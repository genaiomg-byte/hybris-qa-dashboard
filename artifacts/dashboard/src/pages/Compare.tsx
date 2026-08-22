import { useState } from "react";
import { useListRuns, useCompareRuns, ListRunsStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { formatTimeAgo, formatDate } from "@/lib/formatters";

export default function Compare() {
  const [runA, setRunA] = useState<string>("");
  const [runB, setRunB] = useState<string>("");

  const { data: runs, isLoading: runsLoading } = useListRuns({ status: ListRunsStatus.completed, limit: 50 });
  
  const shouldCompare = runA && runB && runA !== runB;
  
  const { data: comparison, isLoading: compareLoading, error } = useCompareRuns(
    { runA, runB }, 
    { query: { enabled: !!shouldCompare, retry: false } }
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Run Comparison</h2>
        <p className="text-muted-foreground mt-1">Select two runs to view regressions and improvements.</p>
      </div>

      <Card className="border-border">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 w-full space-y-2">
              <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Baseline Run</label>
              <Select value={runA} onValueChange={setRunA}>
                <SelectTrigger data-testid="select-run-a">
                  <SelectValue placeholder={runsLoading ? "Loading runs..." : "Select baseline run"} />
                </SelectTrigger>
                <SelectContent>
                  {runs?.map(run => (
                    <SelectItem key={run.id} value={run.id}>
                      {formatDate(run.createdAt)} — {run.url} ({run.environmentTag})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="hidden md:flex pt-6">
              <ArrowRight className="text-muted-foreground" />
            </div>

            <div className="flex-1 w-full space-y-2">
              <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Comparison Run</label>
              <Select value={runB} onValueChange={setRunB}>
                <SelectTrigger data-testid="select-run-b">
                  <SelectValue placeholder={runsLoading ? "Loading runs..." : "Select comparison run"} />
                </SelectTrigger>
                <SelectContent>
                  {runs?.map(run => (
                    <SelectItem key={run.id} value={run.id} disabled={run.id === runA}>
                      {formatDate(run.createdAt)} — {run.url} ({run.environmentTag})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!shouldCompare && (
        <div className="text-center py-20 text-muted-foreground border border-dashed border-border rounded-lg">
          Select two distinct runs to compare them.
        </div>
      )}

      {shouldCompare && compareLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      )}

      {shouldCompare && error && (
        <Card className="border-rose-500/50 bg-rose-500/10">
          <CardContent className="pt-6 text-rose-400 text-center">
            Failed to load comparison data.
          </CardContent>
        </Card>
      )}

      {shouldCompare && comparison && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4">
          <Card className="border-emerald-500/30 bg-card glass-panel relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-500">
                <TrendingUp className="w-5 h-5" /> Improvements
              </CardTitle>
              <CardDescription>Metrics that got better in the comparison run.</CardDescription>
            </CardHeader>
            <CardContent>
              {comparison.improvements.length === 0 ? (
                <div className="text-muted-foreground italic">No improvements detected.</div>
              ) : (
                <ul className="space-y-3">
                  {comparison.improvements.map((imp, i) => (
                    <li key={i} className="flex items-start gap-2 bg-emerald-500/10 text-emerald-400 p-3 rounded text-sm font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      {imp}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-rose-500/30 bg-card glass-panel relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-rose-500">
                <TrendingDown className="w-5 h-5" /> Regressions
              </CardTitle>
              <CardDescription>Metrics that got worse in the comparison run.</CardDescription>
            </CardHeader>
            <CardContent>
              {comparison.regressions.length === 0 ? (
                <div className="text-muted-foreground italic">No regressions detected! Awesome.</div>
              ) : (
                <ul className="space-y-3">
                  {comparison.regressions.map((reg, i) => (
                    <li key={i} className="flex items-start gap-2 bg-rose-500/10 text-rose-400 p-3 rounded text-sm font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                      {reg}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
