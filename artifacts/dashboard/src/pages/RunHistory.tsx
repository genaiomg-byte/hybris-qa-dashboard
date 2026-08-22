import { useState } from "react";
import { useListRuns, useDeleteRun, ListRunsStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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
import { getStatusColor, formatTimeAgo, formatDuration, formatDate } from "@/lib/formatters";
import { Play, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

export default function RunHistory() {
  const { canCreateRun } = useAuth();
  const [status, setStatus] = useState<string>("all");
  const [env, setEnv] = useState<string>("all");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const queryParams = {
    ...(status !== "all" && { status: status as ListRunsStatus }),
    ...(env !== "all" && { environment: env })
  };

  const { data: runs, isLoading } = useListRuns(queryParams);

  const { mutate: deleteRun, isPending: isDeleting } = useDeleteRun({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["listRuns"] });
        setPendingDeleteId(null);
      },
    },
  });

  const runToDelete = pendingDeleteId ? runs?.find(r => r.id === pendingDeleteId) : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Run History</h2>
          <p className="text-muted-foreground mt-1">Review past execution results.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[150px]" data-testid="filter-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={env} onValueChange={setEnv}>
            <SelectTrigger className="w-[150px]" data-testid="filter-env">
              <SelectValue placeholder="Environment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Envs</SelectItem>
              <SelectItem value="staging">Staging</SelectItem>
              <SelectItem value="prod">Production</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex flex-col items-end gap-1">
            <Button disabled data-testid="btn-new-run">
              <Play className="w-4 h-4 mr-2" /> New Run
            </Button>
            <p className="text-xs text-rose-400 max-w-[220px] text-right leading-snug">
              Email{" "}
              <a
                href="mailto:genai.omg.@gmail.com"
                className="underline underline-offset-2 hover:text-rose-300"
                onClick={e => e.stopPropagation()}
              >
                genai.omg.@gmail.com
              </a>{" "}
              for access!!
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-border bg-card shadow-sm glass-panel">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead>Target URL</TableHead>
              <TableHead>Environment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Modules</TableHead>
              <TableHead>Pass Rate</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Executed</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                </TableRow>
              ))
            ) : !runs || runs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  No runs found matching the current filters.
                </TableCell>
              </TableRow>
            ) : (
              runs.map(run => (
                <TableRow 
                  key={run.id} 
                  className="border-border cursor-pointer group"
                  onClick={() => window.location.href = `/runs/${run.id}`}
                  data-testid={`history-row-${run.id}`}
                >
                  <TableCell className="font-mono text-sm group-hover:text-primary transition-colors">
                    {run.url}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-normal">
                      {run.environmentTag || 'default'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={getStatusColor(run.status)}
                      className={run.status === 'running' ? 'animate-pulse' : ''}
                    >
                      {run.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {run.moduleSelection.length}
                  </TableCell>
                  <TableCell>
                    {run.passRate !== null && run.passRate !== undefined ? (
                      <span className={`font-medium ${run.passRate >= 90 ? 'text-emerald-500' : run.passRate >= 75 ? 'text-amber-500' : 'text-rose-500'}`}>
                        {run.passRate.toFixed(1)}%
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDuration(run.durationMs)}
                  </TableCell>
                  <TableCell className="text-muted-foreground" title={formatDate(run.createdAt)}>
                    {formatTimeAgo(run.createdAt)}
                  </TableCell>
                  <TableCell
                    onClick={e => e.stopPropagation()}
                    className="pr-4"
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
                      onClick={() => setPendingDeleteId(run.id)}
                      data-testid={`delete-run-${run.id}`}
                      disabled={isDeleting && pendingDeleteId === run.id}
                    >
                      {isDeleting && pendingDeleteId === run.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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
