import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDownWideNarrow, ArrowLeft, ArrowUpNarrowWide, Pencil, Plus, Trash2 } from "lucide-react";
import { projectService, taskService } from "@/services";
import { EmptyState, ErrorState, LoadingState, PaginationControls, StatusBadge } from "@/components/common";
import { ConfirmDelete, NativeSelect, ProjectDialog, TaskDialog } from "@/components/forms";
import { TaskList } from "@/components/tasks/TaskList";
import { Button } from "@/components/ui/button";
import { TASK_STATUSES, formatDate } from "@/lib/constants";
import type { SortOrder } from "@/services/types";

export const Route = createFileRoute("/_authenticated/projects/$id")({
  head: () => ({
    meta: [
      { title: "Project details — Taskline" },
      { name: "description", content: "Project overview and task workspace with server-side pagination and sorting." },
      { property: "og:title", content: "Project details — Taskline" },
      { property: "og:description", content: "Project overview and task workspace with server-side pagination and sorting." },
    ],
  }),
  component: ProjectDetails,
});

const PROJECT_TASK_SORT_OPTIONS = [
  { value: "created_at:DESC", label: "Newest first" },
  { value: "created_at:ASC", label: "Oldest first" },
  { value: "title:ASC", label: "Title (A–Z)" },
  { value: "title:DESC", label: "Title (Z–A)" },
  { value: "due_date:ASC", label: "Due date (Earliest)" },
  { value: "due_date:DESC", label: "Due date (Latest)" },
  { value: "priority:DESC", label: "Priority" },
  { value: "status:ASC", label: "Status" },
];

function ProjectDetails() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [status, setStatus] = useState("");
  const [sortKey, setSortKey] = useState("created_at:DESC");

  const [editOpen, setEditOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);

  const [sortBy, order] = sortKey.split(":") as [string, SortOrder];

  // Reset page to 1 whenever status or sorting changes
  useEffect(() => {
    setPage(1);
  }, [status, sortKey, limit]);

  const pq = useQuery({
    queryKey: ["project", id],
    queryFn: () => projectService.get(id),
  });

  const taskFilters = {
    project_id: id,
    page,
    limit,
    status: status || undefined,
    sortBy,
    order,
  };

  const tq = useQuery({
    queryKey: ["tasks", taskFilters],
    queryFn: () => taskService.list(taskFilters),
  });

  const del = useMutation({
    mutationFn: () => projectService.remove(id),
    onSuccess: () => {
      toast.success("Project deleted");
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      navigate({ to: "/projects" });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const handleHeaderSort = (field: string) => {
    if (sortBy === field) {
      const nextOrder = order === "ASC" ? "DESC" : "ASC";
      setSortKey(`${field}:${nextOrder}`);
    } else {
      setSortKey(`${field}:ASC`);
    }
  };

  const toggleOrder = () => {
    const nextOrder = order === "ASC" ? "DESC" : "ASC";
    setSortKey(`${sortBy}:${nextOrder}`);
  };

  if (pq.isLoading) return <LoadingState label="Loading project details…" />;
  if (pq.isError || !pq.data) return <ErrorState error={pq.error ?? new Error("Project not found")} onRetry={() => pq.refetch()} />;
  const p = pq.data;

  const tasks = tq.data?.data ?? [];
  const pagination = tq.data?.pagination;

  const handleTaskDeleted = () => {
    if (tasks.length === 1 && page > 1) {
      setPage(page - 1);
    }
  };

  return (
    <div>
      <Link to="/projects" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to Projects
      </Link>
      <div className="border-b pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <StatusBadge value={p.status} />
            <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{p.name}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{p.description || "No description"}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" /> Edit
            </Button>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDelOpen(true)}>
              <Trash2 className="size-4" /> Delete
            </Button>
          </div>
        </div>
        <dl className="mt-6 grid gap-4 border-t pt-5 text-sm sm:grid-cols-3">
          {[
            ["Start date", formatDate(p.start_date)],
            ["Due date", formatDate(p.due_date)],
            ["Owner", p.owner_name ?? (p.owner_id != null ? `User #${p.owner_id}` : "—")],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k}</dt>
              <dd className="mt-1 font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-8 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">Project Tasks</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-36">
            <NativeSelect value={status} onChange={setStatus} options={TASK_STATUSES} placeholder="All statuses" />
          </div>
          <div className="w-44">
            <NativeSelect value={sortKey} onChange={setSortKey} options={PROJECT_TASK_SORT_OPTIONS} placeholder="Sort by" />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleOrder}
            title={order === "ASC" ? "Sort ascending (click for descending)" : "Sort descending (click for ascending)"}
            aria-label={order === "ASC" ? "Sort ascending" : "Sort descending"}
          >
            {order === "ASC" ? <ArrowUpNarrowWide className="size-4 text-primary" /> : <ArrowDownWideNarrow className="size-4 text-primary" />}
          </Button>
          <Button onClick={() => setTaskOpen(true)}>
            <Plus className="size-4" /> Add task
          </Button>
        </div>
      </div>

      {tq.isLoading ? (
        <LoadingState label="Loading project tasks…" />
      ) : tq.isError ? (
        <ErrorState error={tq.error} onRetry={() => tq.refetch()} />
      ) : tasks.length === 0 ? (
        <EmptyState
          title={status ? "No tasks match filter" : "No tasks in this project"}
          hint={status ? "Try resetting the status filter." : "Add a task to start tracking work for this project."}
          action={
            status ? (
              <Button variant="outline" size="sm" onClick={() => setStatus("")}>
                Clear filter
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <TaskList
            tasks={tasks}
            projects={[p]}
            showProject={false}
            onSortChange={handleHeaderSort}
            currentSort={{ sortBy, order }}
            onTaskDeleted={handleTaskDeleted}
          />

          {/* Server-side Pagination for Project Tasks */}
          <PaginationControls
            pagination={pagination}
            onPageChange={setPage}
            onLimitChange={setLimit}
            itemName="tasks"
            disabled={tq.isFetching}
          />
        </>
      )}

      <ProjectDialog open={editOpen} onOpenChange={setEditOpen} project={p} />
      <TaskDialog open={taskOpen} onOpenChange={setTaskOpen} projects={[p]} defaultProjectId={String(p.id)} />
      <ConfirmDelete
        open={delOpen}
        onOpenChange={setDelOpen}
        title="Delete project?"
        description={`"${p.name}" will be permanently removed.`}
        pending={del.isPending}
        onConfirm={() => del.mutate()}
      />
    </div>
  );
}
