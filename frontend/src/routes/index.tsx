import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LoadingState } from "@/components/common";
import { useAuth } from "@/context/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Taskline — Project Management" },
      { name: "description", content: "Manage projects, tasks and team progress in one workspace." },
      { property: "og:title", content: "Taskline — Project Management" },
      { property: "og:description", content: "Manage projects, tasks and team progress in one workspace." },
    ],
  }),
  component: Index,
});

function Index() {
  const { status } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (status === "authenticated") navigate({ to: "/dashboard", replace: true });
    if (status === "anonymous") navigate({ to: "/login", replace: true });
  }, [status, navigate]);
  return <LoadingState />;
}
