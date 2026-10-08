import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Plus, Search } from "lucide-react";
import { projectService, taskService } from "@/services";
import { EmptyState, ErrorState, LoadingState, PageHeader, PaginationControls } from "@/components/common";
import { NativeSelect, TaskDialog } from "@/components/forms";
import { TaskList } from "@/components/tasks/TaskList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants";
import { useDebounced } from "@/hooks/use-debounced";
import type { SortOrder } from "@/services/types";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Tasks — Taskline" },
      { name: "description", content: "Search, filter and manage tasks across all projects with server-side pagination and sorting." },
      { property: "og:title", content: "Tasks — Taskline" },
      { property: "og:description", content: "Search, filter and manage tasks across all projects with server-side pagination and sorting." },
    ],
  }),
  component: TasksPage,
});

const TASK_SORT_OPTIONS = [
  { value: "created_at:DESC", label: "Newest first" },
  { value: "created_at:ASC", label: "Oldest first" },
  { value: "title:ASC", label: "Title (A–Z)" },
  { value: "title:DESC", label: "Title (Z–A)" },
  { value: "due_date:ASC", label: "Due date (Earliest)" },
  { value: "due_date:DESC", label: "Due date (Latest)" },
  { value: "priority:DESC", label: "Priority" },
  { value: "status:ASC", label: "Status" },
  { value: "updated_at:DESC", label: "Recently updated" },
];

function TasksPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [projectId, setProjectId] = useState("");
  const [sortKey, setSortKey] = useState("created_at:DESC");
  const [open, setOpen] = useState(false);

  const [sortBy, order] = sortKey.split(":") as [string, SortOrder];
  const s = useDebounced(search, 300);

  // Reset to page 1 whenever filters or sorting change
  useEffect(() => {
    setPage(1);
  }, [s, status, priority, projectId, sortKey, limit]);

  const filters = {
    page,
    limit,
    search: s || undefined,
    status: status || undefined,
    priority: priority || undefined,
    project_id: projectId || undefined,
    sortBy,
    order,
  };

  const tq = useQuery({
    queryKey: ["tasks", filters],
    queryFn: () => taskService.list(filters),
  });

  const pq = useQuery({
    queryKey: ["projects", "for_task_filter"],
    queryFn: () => projectService.list({ limit: 100 }),
  });

  const projects = pq.data?.data ?? [];
  const tasks = tq.data?.data ?? [];
  const pagination = tq.data?.pagination;
  const filtered = Boolean(s || status || priority || projectId);

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

  const handleTaskDeleted = () => {
    if (tasks.length === 1 && page > 1) {
      setPage(page - 1);
    }
  };

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle="Every task across your projects with server-side pagination, sorting, and real-time filtering."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> New task
          </Button>
        }
      />

      {/* Filter and Sort Toolbar */}
      <div className="mb-5 flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="bg-card pl-9"
              placeholder="Search tasks by title or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="lg:w-36">
            <NativeSelect value={status} onChange={setStatus} options={TASK_STATUSES} placeholder="All statuses" />
          </div>
          <div className="lg:w-36">
            <NativeSelect value={priority} onChange={setPriority} options={TASK_PRIORITIES} placeholder="All priorities" />
          </div>
          <div className="sm:col-span-2 lg:col-span-1 lg:w-48">
            <NativeSelect
              value={projectId}
              onChange={setProjectId}
              placeholder="All projects"
              options={projects.map((p) => ({ value: String(p.id), label: p.name }))}
            />
          </div>
        </div>

        {/* Quick Sorting Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Sort by:</span>
            <div className="w-48 sm:w-56">
              <NativeSelect
                value={sortKey}
                onChange={setSortKey}
                options={TASK_SORT_OPTIONS}
                placeholder="Sort by"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={toggleOrder}
              title={order === "ASC" ? "Sort ascending (click for descending)" : "Sort descending (click for ascending)"}
              aria-label={order === "ASC" ? "Sort ascending" : "Sort descending"}
            >
              {order === "ASC" ? <ArrowUpNarrowWide className="size-4 text-primary" /> : <ArrowDownWideNarrow className="size-4 text-primary" />}
            </Button>
          </div>

          {filtered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatus("");
                setPriority("");
                setProjectId("");
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Reset filters
            </Button>
          )}
        </div>
      </div>

      {tq.isLoading ? (
        <LoadingState label="Loading tasks from server…" />
      ) : tq.isError ? (
        <ErrorState error={tq.error} onRetry={() => tq.refetch()} />
      ) : tasks.length === 0 ? (
        <EmptyState
          title={filtered ? "No matching tasks" : "No tasks yet"}
          hint={filtered ? "Try adjusting your search query or filter criteria." : "Create your first task to get started."}
          action={
            filtered ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setStatus("");
                  setPriority("");
                  setProjectId("");
                }}
              >
                Clear all filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <TaskList
            tasks={tasks}
            projects={projects}
            onSortChange={handleHeaderSort}
            currentSort={{ sortBy, order }}
            onTaskDeleted={handleTaskDeleted}
          />

          {/* Server-Side Pagination Bar */}
          <PaginationControls
            pagination={pagination}
            onPageChange={setPage}
            onLimitChange={setLimit}
            itemName="tasks"
            disabled={tq.isFetching}
          />
        </>
      )}

      <TaskDialog open={open} onOpenChange={setOpen} projects={projects} />
    </div>
  );
}
