import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { labelize } from "@/lib/constants";
import { Button } from "@/components/ui/button";

const statusTone: Record<string, string> = {
  TODO: "bg-muted text-muted-foreground",
  NOT_STARTED: "bg-muted text-muted-foreground",
  PLANNING: "bg-secondary text-secondary-foreground",
  PENDING: "bg-warning-soft text-warning",
  IN_PROGRESS: "bg-info-soft text-info",
  IN_REVIEW: "bg-violet-soft text-violet",
  ON_HOLD: "bg-warning-soft text-warning",
  DONE: "bg-success-soft text-success",
  COMPLETED: "bg-success-soft text-success",
  ARCHIVED: "bg-muted text-muted-foreground",
  BLOCKED: "bg-danger-soft text-destructive",
  ACTIVE: "bg-info-soft text-info",
};
const priorityTone: Record<string, string> = {
  LOW: "bg-muted text-muted-foreground",
  MEDIUM: "bg-warning-soft text-warning",
  HIGH: "bg-danger-soft text-destructive",
  URGENT: "bg-destructive text-destructive-foreground",
};

export function StatusBadge({ value, kind = "status" }: { value?: string | null; kind?: "status" | "priority" }) {
  if (!value) return <span className="text-xs text-muted-foreground">—</span>;
  const key = value.toUpperCase();
  const tone = (kind === "status" ? statusTone : priorityTone)[key] ?? "bg-secondary text-secondary-foreground";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", tone)}>
      {kind === "status" && <span className="size-1.5 rounded-full bg-current" />}
      {labelize(value)}
    </span>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> {label}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card py-14 text-center">
      <AlertTriangle className="size-8 text-destructive" />
      <p className="max-w-sm text-sm text-muted-foreground">{(error as Error)?.message ?? "Something went wrong."}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-card py-14 text-center">
      <Inbox className="size-8 text-muted-foreground" />
      <p className="font-semibold text-foreground">{title}</p>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function PaginationControls({
  pagination,
  onPageChange,
  onLimitChange,
  itemName = "items",
  limitOptions = [10, 20, 50, 100],
  disabled = false,
}: {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  onPageChange: (newPage: number) => void;
  onLimitChange?: (newLimit: number) => void;
  itemName?: string;
  limitOptions?: number[];
  disabled?: boolean;
}) {
  if (!pagination || pagination.total === 0) return null;

  const { page, limit, total, totalPages, hasNextPage, hasPreviousPage } = pagination;
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  // Generate page numbers to show
  const getPageNumbers = () => {
    const delta = 1;
    const range: (number | "...")[] = [];
    const rangeWithDots: (number | "...")[] = [];
    let l: number | undefined;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (typeof i === "number" && typeof l === "number") {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l > 2) {
          rangeWithDots.push("...");
        }
      }
      rangeWithDots.push(i);
      if (typeof i === "number") l = i;
    }

    return rangeWithDots;
  };

  const pages = getPageNumbers();

  return (
    <div className="mt-6 flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center justify-between gap-4 sm:justify-start">
        <p className="text-xs text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{start}</span>–
          <span className="font-semibold text-foreground">{end}</span> of{" "}
          <span className="font-semibold text-foreground">{total}</span> {itemName}
        </p>
        {onLimitChange && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Rows per page:</span>
            <select
              aria-label="Rows per page"
              disabled={disabled}
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="h-7 rounded border border-input bg-transparent px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {limitOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-1 sm:justify-end">
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || !hasPreviousPage}
          onClick={() => onPageChange(page - 1)}
          aria-label="Go to previous page"
          className="h-8 gap-1 px-2 text-xs"
        >
          <span className="inline">Previous</span>
        </Button>

        <span className="px-2 text-xs font-medium text-muted-foreground sm:hidden">
          Page {page} of {totalPages}
        </span>

        <div className="hidden items-center gap-1 sm:flex">
          {pages.map((p, idx) =>
            p === "..." ? (
              <span key={`dots-${idx}`} className="px-2 text-xs text-muted-foreground">
                …
              </span>
            ) : (
              <Button
                key={`page-${p}`}
                variant={p === page ? "default" : "outline"}
                size="sm"
                disabled={disabled}
                onClick={() => onPageChange(p as number)}
                aria-label={`Go to page ${p}`}
                aria-current={p === page ? "page" : undefined}
                className="h-8 min-w-[32px] px-2 text-xs"
              >
                {p}
              </Button>
            ),
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={disabled || !hasNextPage}
          onClick={() => onPageChange(page + 1)}
          aria-label="Go to next page"
          className="h-8 gap-1 px-2 text-xs"
        >
          <span className="inline">Next</span>
        </Button>
      </div>
    </div>
  );
}

