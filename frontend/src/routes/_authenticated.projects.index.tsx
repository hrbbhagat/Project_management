import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownAZ,
  ArrowDownWideNarrow,
  ArrowUpDown,
  ArrowUpNarrowWide,
  CalendarDays,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { projectService } from "@/services";
import { EmptyState, ErrorState, LoadingState, PageHeader, PaginationControls, StatusBadge } from "@/components/common";
import { ConfirmDelete, NativeSelect, ProjectDialog } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PROJECT_STATUSES, formatDate } from "@/lib/constants";
import { useDebounced } from "@/hooks/use-debounced";
import type { Project } from "@/types";
import type { SortOrder } from "@/services/types";

export const Route = createFileRoute("/_authenticated/projects/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Projects — Taskline" },
      { name: "description", content: "Browse, search and manage all your projects." },
      { property: "og:title", content: "Projects — Taskline" },
      { property: "og:description", content: "Browse, search and manage all your projects." },
    ],
  }),
  component: ProjectsPage,
});

const PROJECT_SORT_OPTIONS = [
  { value: "created_at:DESC", label: "Newest first" },
  { value: "created_at:ASC", label: "Oldest first" },
  { value: "name:ASC", label: "Name (A–Z)" },
  { value: "name:DESC", label: "Name (Z–A)" },
  { value: "due_date:ASC", label: "Due date (Earliest)" },
  { value: "due_date:DESC", label: "Due date (Latest)" },
  { value: "status:ASC", label: "Status" },
  { value: "updated_at:DESC", label: "Recently updated" },
];

function ProjectsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sortKey, setSortKey] = useState("created_at:DESC");

  const [sortBy, order] = sortKey.split(":") as [string, SortOrder];
  const s = useDebounced(search, 300);

  // Reset to page 1 whenever filters or sorting change
  useEffect(() => {
    setPage(1);
  }, [s, status, sortKey, limit]);

  const filters = { page, limit, search: s || undefined, status: status || undefined, sortBy, order };
  const q = useQuery({
    queryKey: ["projects", filters],
    queryFn: () => projectService.list(filters),
  });

  const [dialog, setDialog] = useState<{ open: boolean; project?: Project }>({ open: false });
  const [deleting, setDeleting] = useState<Project>();

  const del = useMutation({
    mutationFn: (p: Project) => projectService.remove(p.id),
    onSuccess: () => {
      toast.success("Project deleted");
      setDeleting(undefined);
      // If deleting the last item on current page, move back 1 page if page > 1
      if (q.data && q.data.data.length === 1 && page > 1) {
        setPage(page - 1);
      }
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const toggleOrder = () => {
    const nextOrder = order === "ASC" ? "DESC" : "ASC";
    setSortKey(`${sortBy}:${nextOrder}`);
  };

  const hasActiveFilters = Boolean(s || status);
  const projects = q.data?.data ?? [];
  const pagination = q.data?.pagination;

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle="All projects you have access to with server-side pagination and sorting."
        actions={
          <Button onClick={() => setDialog({ open: true })}>
            <Plus className="size-4" /> New project
          </Button>
        }
      />

      {/* Search, Filter, and Sort Toolbar */}
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="bg-card pl-9"
            placeholder="Search projects by name or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-44">
            <NativeSelect value={status} onChange={setStatus} options={PROJECT_STATUSES} placeholder="All statuses" />
          </div>

          <div className="w-full sm:w-52">
            <NativeSelect
              value={sortKey}
              onChange={setSortKey}
              options={PROJECT_SORT_OPTIONS}
              placeholder="Sort by"
            />
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
        </div>
      </div>

      {q.isLoading ? (
        <LoadingState label="Loading projects from server…" />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : projects.length === 0 ? (
        <EmptyState
          title={hasActiveFilters ? "No matching projects" : "No projects yet"}
          hint={hasActiveFilters ? "Try adjusting your search query or status filter." : "Create your first project to get going."}
          action={
            hasActiveFilters ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setStatus("");
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <div key={String(p.id)} className="card-interactive relative flex flex-col rounded-xl border bg-card p-5 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <StatusBadge value={p.status} />
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="relative z-10 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Project actions"
                    >
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setDialog({ open: true, project: p })}>
                        <Pencil className="size-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleting(p)}>
                        <Trash2 className="size-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <Link to="/projects/$id" params={{ id: String(p.id) }} className="mt-3 after:absolute after:inset-0">
                  <h3 className="text-lg font-semibold text-foreground">{p.name}</h3>
                </Link>
                <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">{p.description || "No description"}</p>

                {typeof p.progress === "number" && (
                  <div className="mt-4">
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold">{p.progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted">
                      <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${p.progress}%` }} />
                    </div>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3.5" /> Start {formatDate(p.start_date)}
                  </span>
                  <span>Due {formatDate(p.due_date)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Server-Side Pagination Bar */}
          <PaginationControls
            pagination={pagination}
            onPageChange={setPage}
            onLimitChange={setLimit}
            itemName="projects"
            disabled={q.isFetching}
          />
        </>
      )}

      <ProjectDialog open={dialog.open} project={dialog.project} onOpenChange={(o) => setDialog({ open: o })} />
      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(undefined)}
        title="Delete project?"
        description={`"${deleting?.name ?? ""}" will be permanently removed.`}
        pending={del.isPending}
        onConfirm={() => deleting && del.mutate(deleting)}
      />
    </div>
  );
}
