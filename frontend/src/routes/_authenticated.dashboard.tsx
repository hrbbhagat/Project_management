import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, FolderKanban, ListChecks, Loader } from "lucide-react";
import { dashboardService, projectService, taskService } from "@/services";
import { ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/common";
import { DONE_STATUS, TASK_STATUSES, formatDate, labelize } from "@/lib/constants";
import { useAuth } from "@/context/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Dashboard — Taskline" },
      { name: "description", content: "Overview of your projects and task progress." },
      { property: "og:title", content: "Dashboard — Taskline" },
      { property: "og:description", content: "Overview of your projects and task progress." },
    ],
  }),
  component: Dashboard,
});

const statusColor: Record<string, string> = {
  DONE: "var(--success)",
  TODO: "var(--warning)",
  IN_PROGRESS: "var(--primary)",
  IN_REVIEW: "var(--info)",
  BLOCKED: "var(--destructive)",
};
const priorityClass: Record<string, string> = {
  HIGH: "bg-danger-soft text-destructive",
  MEDIUM: "bg-warning-soft text-warning",
  LOW: "bg-success-soft text-success",
};

function Dashboard() {
  const { user } = useAuth();
  const stats = useQuery({ queryKey: ["dashboard"], queryFn: dashboardService.get });
  const projects = useQuery({ queryKey: ["projects", "", ""], queryFn: () => projectService.list({}) });
  const tasks = useQuery({ queryKey: ["tasks", "dashboard"], queryFn: () => taskService.list({}) });

  if (stats.isLoading || projects.isLoading || tasks.isLoading) return <LoadingState />;
  const err = stats.error ?? projects.error ?? tasks.error;
  if (err) return <ErrorState error={err} onRetry={() => { stats.refetch(); projects.refetch(); tasks.refetch(); }} />;

  const s = (stats.data ?? {}) as Record<string, unknown>;
  const allTasks = tasks.data?.data ?? [];
  const allProjects = projects.data?.data ?? [];
  const num = (k: string) => Number(s[k] ?? 0);
  const cards = [
    { label: "Total Projects", value: num("total_projects"), icon: FolderKanban, tone: "bg-accent text-accent-foreground" },
    { label: "Total Tasks", value: num("total_tasks"), icon: ListChecks, tone: "bg-info-soft text-info" },
    { label: "Completed Tasks", value: num("completed_tasks"), icon: CheckCircle2, tone: "bg-success-soft text-success" },
    { label: "Pending Tasks", value: num("pending_tasks"), icon: Clock, tone: "bg-warning-soft text-warning" },
    { label: "Projects In Progress", value: num("projects_in_progress"), icon: Loader, tone: "bg-accent text-primary" },
  ];

  const dist = TASK_STATUSES.map((st) => ({ st, n: allTasks.filter((t) => t.status === st).length }));
  const total = dist.reduce((a, b) => a + b.n, 0) || 1;
  let acc = 0;
  const gradient = dist.map(({ st, n }) => { const from = acc; acc += (n / total) * 360; return `${statusColor[st]} ${from}deg ${acc}deg`; }).join(", ");
  const donePct = Math.round(((dist.find((d) => d.st === DONE_STATUS)?.n ?? 0) / total) * 100);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = allTasks.filter((t) => t.status !== DONE_STATUS && t.due_date).sort((a, b) => String(a.due_date).localeCompare(String(b.due_date))).slice(0, 6);
  const recentTasks = [...allTasks].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader title={`Hello${user?.name ? `, ${String(user.name).split(" ")[0]}` : ""}`} subtitle="Here's what's happening across your workspace." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="card-interactive rounded-xl border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <div className={cn("grid size-8 place-items-center rounded-lg", tone)}><Icon className="size-4" /></div>
            </div>
            <p className="mt-3 font-display text-3xl font-bold">{value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border bg-card p-5 shadow-card">
          <h3 className="mb-4 font-semibold">Task status distribution</h3>
          <div className="flex items-center gap-6">
            <div className="relative size-36 shrink-0 rounded-full" style={{ background: `conic-gradient(${gradient})` }}>
              <div className="absolute inset-4 grid place-items-center rounded-full bg-card text-center">
                <div><p className="font-display text-2xl font-bold">{donePct}%</p><p className="text-xs text-muted-foreground">done</p></div>
              </div>
            </div>
            <ul className="space-y-2 text-sm">
              {dist.map(({ st, n }) => (
                <li key={st} className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ background: statusColor[st] }} />
                  <span className="text-muted-foreground">{labelize(st)}</span>
                  <span className="ml-auto pl-3 font-semibold">{n}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5 shadow-card lg:col-span-2">
          <h3 className="mb-4 font-semibold">Project progress</h3>
          <div className="space-y-3">
            {allProjects.slice(0, 6).map((p) => (
              <div key={String(p.id)}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <Link to="/projects/$id" params={{ id: String(p.id) }} className="truncate font-medium hover:text-primary">{p.name}</Link>
                  <div className="flex items-center gap-2"><StatusBadge value={p.status} /><span className="w-10 text-right font-semibold">{p.progress ?? 0}%</span></div>
                </div>
                <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${p.progress ?? 0}%` }} /></div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ListCard title="Recent projects">
          {allProjects.slice(0, 6).map((p) => (
            <li key={String(p.id)} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-muted/60">
              <Link to="/projects/$id" params={{ id: String(p.id) }} className="truncate font-medium hover:text-primary">{p.name}</Link>
              <StatusBadge value={p.status} />
            </li>
          ))}
        </ListCard>
        <ListCard title="Recent tasks">
          {recentTasks.map((t) => (
            <li key={String(t.id)} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-muted/60">
              <div className="min-w-0"><p className="truncate font-medium">{t.title}</p><p className="truncate text-xs text-muted-foreground">{t.project_name}</p></div>
              <StatusBadge value={t.status} />
            </li>
          ))}
        </ListCard>
        <ListCard title="Upcoming deadlines" icon={<CalendarClock className="size-4 text-primary" />}>
          {upcoming.map((t) => {
            const overdue = String(t.due_date) < today;
            return (
              <li key={String(t.id)} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-muted/60">
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.title}</p>
                  <p className={cn("flex items-center gap-1 text-xs", overdue ? "text-destructive" : "text-muted-foreground")}>
                    {overdue && <AlertTriangle className="size-3" />} {overdue ? "Overdue · " : "Due "}{formatDate(t.due_date)}
                  </p>
                </div>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", priorityClass[String(t.priority)] ?? "bg-muted")}>{labelize(t.priority)}</span>
              </li>
            );
          })}
        </ListCard>
      </div>
    </div>
  );
}

function ListCard({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card shadow-card">
      <h3 className="flex items-center gap-2 border-b px-5 py-4 font-semibold">{icon}{title}</h3>
      <ul className="divide-y">{children}</ul>
    </section>
  );
}
