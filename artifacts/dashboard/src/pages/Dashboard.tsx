import { useState } from "react";
import { useGetDashboardSummary, useDeleteRun } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle2, ListRestart, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatTimeAgo, getStatusColor, formatDuration } from "@/lib/formatters";
import { Link, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: summary, isLoading } = useGetDashboardSummary();

  const { mutate: deleteRun, isPending: isDeleting } = useDeleteRun({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["getGetDashboardSummary"] });
        queryClient.invalidateQueries({ queryKey: ["listRuns"] });
        setPendingDeleteId(null);
      },
    },
  });

  const runToDelete = pendingDeleteId
    ? summary?.recentRuns.find(r => r.id === pendingDeleteId)
    : null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 col-span-2 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!summary) return <div>Failed to load dashboard</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Control Room</h2>
          <p className="text-muted-foreground mt-1">System status and recent automated test runs.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Runs</CardTitle>
            <ListRestart className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="stat-total-runs">{summary.totalRuns}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overall Pass Rate</CardTitle>
            <CheckCircle2 className={`w-4 h-4 ${summary.overallPassRate > 90 ? 'text-green-500' : summary.overallPassRate > 75 ? 'text-amber-500' : 'text-rose-500'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="stat-pass-rate">{summary.overallPassRate.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Runs This Week</CardTitle>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="stat-weekly-runs">{summary.totalRunsThisWeek}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Duration</CardTitle>
            <Clock className="w-4 h-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="stat-avg-duration">{formatDuration(summary.averageDurationMs)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Test Runs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {summary.recentRuns.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No recent runs</div>
                ) : (
                  summary.recentRuns.map(run => (
                    <div
                      key={run.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border bg-background/50 hover:bg-accent/50 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/runs/${run.id}`)}
                      data-testid={`run-row-${run.id}`}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={getStatusColor(run.status)}
                            className={run.status === 'running' ? 'animate-pulse' : ''}
                          >
                            {run.status.toUpperCase()}
                          </Badge>
                          <span className="font-mono text-sm text-foreground">{run.url}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {run.moduleSelection.length} modules • {formatTimeAgo(run.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-sm font-medium">
                            {run.passRate !== null && run.passRate !== undefined ? `${run.passRate.toFixed(0)}% Pass` : '-'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDuration(run.durationMs)}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 shrink-0"
                          onClick={e => { e.stopPropagation(); setPendingDeleteId(run.id); }}
                          data-testid={`delete-run-${run.id}`}
                          disabled={isDeleting && pendingDeleteId === run.id}
                        >
                          {isDeleting && pendingDeleteId === run.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Module Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {summary.moduleBreakdown.map(mb => (
                <div key={mb.module} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize font-medium">{mb.module}</span>
                    <span className="text-muted-foreground">{mb.passRate.toFixed(0)}%</span>
                  </div>
                  <Progress
                    value={mb.passRate}
                    className="h-2"
                    data-testid={`progress-module-${mb.module}`}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!pendingDeleteId} onOpenChange={open => { if (!open) setPendingDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this run?</AlertDialogTitle>
            <AlertDialogDescription>
              {runToDelete && (
                <>
                  Run on <span className="font-mono text-foreground">{runToDelete.url}</span>
                  {" "}({formatTimeAgo(runToDelete.createdAt)}) and all its results will be permanently deleted.
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-600"
              disabled={isDeleting}
              onClick={() => pendingDeleteId && deleteRun({ id: pendingDeleteId })}
            >
              {isDeleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting…</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
