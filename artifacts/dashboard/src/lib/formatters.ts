import { formatDistanceToNow, format } from "date-fns";

export function getStatusColor(status: string) {
  switch (status) {
    case 'pass':
    case 'completed': return 'success';
    case 'fail':
    case 'failed': return 'destructive';
    case 'warning': return 'warning';
    case 'running': return 'default'; // default in badge is primary (blue)
    default: return 'pending';
  }
}

export function formatTimeAgo(dateString?: string | null) {
  if (!dateString) return '-';
  return formatDistanceToNow(new Date(dateString), { addSuffix: true });
}

export function formatDate(dateString?: string | null) {
  if (!dateString) return '-';
  return format(new Date(dateString), 'MMM d, yyyy HH:mm');
}

export function formatDuration(ms?: number | null) {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}
