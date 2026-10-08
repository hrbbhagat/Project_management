import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowDownWideNarrow,
  ArrowUpDown,
  ArrowUpNarrowWide,
  CalendarDays,
  CheckCircle2,
  Circle,
  MoreHorizontal,
  Pencil,
  Trash2,
  User,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/common";
import { ConfirmDelete, TaskDialog } from "@/components/forms";
import { taskService } from "@/services";
import { DONE_STATUS, formatDate } from "@/lib/constants";
import type { Project, Task } from "@/types";
import type { SortOrder } from "@/services/types";

export function TaskList({
  tasks,
  projects,
  showProject = true,
  onSortChange,
  currentSort,
  onTaskDeleted,
}: {
  tasks: Task[];
  projects: Project[];
  showProject?: boolean;
  onSortChange?: (field: string) => void;
  currentSort?: { sortBy: string; order: SortOrder };
  onTaskDeleted?: () => void;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Task | undefined>();
  const [deleting, setDeleting] = useState<Task | undefined>();
  const projectName = (t: Task) => t.project_name ?? projects.find((p) => String(p.id) === String(t.project_id))?.name;

  const toggle = useMutation({
    mutationFn: (t: Task) => taskService.update(t.id, { status: t.status === DONE_STATUS ? "TODO" : DONE_STATUS }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const del = useMutation({
    mutationFn: (t: Task) => taskService.remove(t.id),
    onSuccess: () => {
      toast.success("Task deleted");
      setDeleting(undefined);
      onTaskDeleted?.();
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const renderSortIcon = (field: string) => {
    if (!currentSort || currentSort.sortBy !== field) {
      return <ArrowUpDown className="size-3 text-muted-foreground/60" />;
    }
    return currentSort.order.toUpperCase() === "ASC" ? (
      <ArrowUpNarrowWide className="size-3 font-bold text-primary" />
    ) : (
      <ArrowDownWideNarrow className="size-3 font-bold text-primary" />
    );
  };

  return (
    <>
      <div className="overflow-hidden rounded-xl border bg-card shadow-card">
        {/* Table Sort Header Bar (when onSortChange is provided) */}
        {onSortChange && (
          <div className="hidden items-center justify-between border-b bg-muted/40 px-4 py-2.5 text-xs font-semibold text-muted-foreground md:flex">
            <div className="flex items-center gap-4">
              <span className="w-6"></span>
              <button
                type="button"
                onClick={() => onSortChange("title")}
                className="flex items-center gap-1 hover:text-foreground"
                aria-label="Sort by task title"
              >
                <span>Task</span>
                {renderSortIcon("title")}
              </button>
            </div>

            <div className="flex items-center gap-6 pr-8">
              <button
                type="button"
                onClick={() => onSortChange("status")}
                className="flex items-center gap-1 hover:text-foreground"
                aria-label="Sort by status"
              >
                <span>Status</span>
                {renderSortIcon("status")}
              </button>

              <button
                type="button"
                onClick={() => onSortChange("priority")}
                className="flex items-center gap-1 hover:text-foreground"
                aria-label="Sort by priority"
              >
                <span>Priority</span>
                {renderSortIcon("priority")}
              </button>

              <button
                type="button"
                onClick={() => onSortChange("due_date")}
                className="flex items-center gap-1 hover:text-foreground"
                aria-label="Sort by due date"
              >
                <span>Due Date</span>
                {renderSortIcon("due_date")}
              </button>

              <button
                type="button"
                onClick={() => onSortChange("created_at")}
                className="flex items-center gap-1 hover:text-foreground"
                aria-label="Sort by created date"
              >
                <span>Created</span>
                {renderSortIcon("created_at")}
              </button>
            </div>
          </div>
        )}

        <div className="divide-y">
          {tasks.map((t) => {
            const done = t.status === DONE_STATUS || t.status === "COMPLETED";
            return (
              <div key={String(t.id)} className="group flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted/60">
                <button
                  aria-label={done ? "Mark as not done" : "Mark as done"}
                  onClick={() => toggle.mutate(t)}
                  className="mt-0.5 text-muted-foreground transition-colors hover:text-success"
                >
                  {done ? <CheckCircle2 className="size-5 text-success" /> : <Circle className="size-5" />}
                </button>
                <div className="min-w-0 flex-1">
                  <button onClick={() => setEditing(t)} className="text-left">
                    <p className={`font-semibold text-foreground ${done ? "text-muted-foreground line-through" : ""}`}>{t.title}</p>
                  </button>
                  {t.description && <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{t.description}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                    <StatusBadge value={t.status} />
                    <StatusBadge value={t.priority} kind="priority" />
                    {showProject && projectName(t) && <span className="font-medium text-accent-foreground">{projectName(t)}</span>}
                    {t.due_date && (
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3.5" /> {formatDate(t.due_date)}
                      </span>
                    )}
                    {(t.assignee_name || t.assigned_to_name || t.assigned_to != null) && (
                      <span className="inline-flex items-center gap-1">
                        <User className="size-3.5" /> {String(t.assignee_name ?? t.assigned_to_name ?? `User #${t.assigned_to}`)}
                      </span>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Task actions"
                  >
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditing(t)}>
                      <Pencil className="size-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => setDeleting(t)}>
                      <Trash2 className="size-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      </div>
      <TaskDialog open={!!editing} onOpenChange={(o) => !o && setEditing(undefined)} task={editing} projects={projects} />
      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(undefined)}
        title="Delete task?"
        description={`"${deleting?.title ?? ""}" will be permanently removed.`}
        pending={del.isPending}
        onConfirm={() => deleting && del.mutate(deleting)}
      />
    </>
  );
}
