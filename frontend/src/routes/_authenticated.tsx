import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingState } from "@/components/common";
import { useAuth } from "@/context/auth";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { status } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (status === "anonymous") navigate({ to: "/login" });
  }, [status, navigate]);
  if (status !== "authenticated") return <LoadingState label="Checking your session…" />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
