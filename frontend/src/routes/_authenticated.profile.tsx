import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, Mail, UserRound } from "lucide-react";
import { PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Profile — Taskline" },
      { name: "description", content: "Your Taskline account details." },
      { property: "og:title", content: "Profile — Taskline" },
      { property: "og:description", content: "Your Taskline account details." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { user, logout } = useAuth();
  const name = String(user?.name ?? user?.email ?? "");
  return (
    <div>
      <PageHeader title="Profile" subtitle="Your account details." />
      <div className="max-w-xl rounded-xl border bg-card p-6 shadow-card">
        <div className="flex items-center gap-4">
          <div className="grid size-16 place-items-center rounded-full bg-primary text-xl font-bold text-primary-foreground">{name.slice(0, 2).toUpperCase()}</div>
          <div>
            <p className="text-lg font-semibold">{name}</p>
            {user?.role && <p className="text-sm text-muted-foreground">{String(user.role)}</p>}
          </div>
        </div>
        <dl className="mt-6 space-y-3 border-t pt-5 text-sm">
          <div className="flex items-center gap-3"><UserRound className="size-4 text-muted-foreground" /><dt className="w-16 text-muted-foreground">Name</dt><dd className="font-medium">{String(user?.name ?? "—")}</dd></div>
          <div className="flex items-center gap-3"><Mail className="size-4 text-muted-foreground" /><dt className="w-16 text-muted-foreground">Email</dt><dd className="font-medium">{user?.email}</dd></div>
          <div className="flex items-center gap-3"><BadgeCheck className="size-4 text-muted-foreground" /><dt className="w-16 text-muted-foreground">Role</dt><dd className="font-medium">{String(user?.role ?? "—")}</dd></div>
        </dl>
        <Button variant="outline" className="mt-6" onClick={() => logout()}>Sign out</Button>
      </div>
    </div>
  );
}
