import { Link, useRouterState } from "@tanstack/react-router";
import { FolderKanban, LayoutDashboard, ListChecks, LogOut, Menu, UserRound, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/context/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/profile", label: "Profile", icon: UserRound },
] as const;

export function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-8 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
        <FolderKanban className="size-4" />
      </div>
      <span className="font-display text-lg font-semibold">Taskline</span>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const initials = (user?.name ?? user?.email ?? "?").slice(0, 2).toUpperCase();

  const sidebar = (
    <aside className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center justify-between px-5 text-sidebar-accent-foreground">
        <Brand />
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
          <X className="size-5" />
        </Button>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">Workspace</p>
        {nav.map(({ to, label, icon: Icon }) => {
          const active = pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_2px_0_0_var(--sidebar-primary)]"
                  : "hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className={cn("size-4", active && "text-sidebar-primary")} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <Button variant="ghost"
          onClick={() => logout()}
          className="flex w-full justify-start gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        >
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <div className="sticky top-0 hidden h-screen lg:block">{sidebar}</div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
          <div className="relative h-full">{sidebar}</div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card/80 px-4 backdrop-blur sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}>
            <Menu className="size-5" />
          </Button>
          <div className="hidden text-sm text-muted-foreground lg:block">
            {nav.find((n) => pathname.startsWith(n.to))?.label ?? ""}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight">{user?.name ?? user?.email}</p>
              {user?.name && <p className="text-xs text-muted-foreground">{user.email}</p>}
            </div>
            <div className="grid size-9 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">{initials}</div>
          </div>
        </header>
        <main key={pathname} className="workspace-page mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
