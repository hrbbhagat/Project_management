import { describe, expect, it } from "vitest";
import { unwrap } from "@/services/api";
import type { DashboardStats } from "@/types";

describe("Dashboard API & Response Mapping", () => {
  // Helper mimicking the exact mapping in _authenticated.dashboard.tsx
  const mapDashboardCards = (statsData: DashboardStats | undefined) => {
    const s = (statsData ?? {}) as Record<string, unknown>;
    const num = (camelKey: string, snakeKey?: string) =>
      Number(s[camelKey] ?? (snakeKey ? s[snakeKey] : undefined) ?? 0);

    return {
      totalProjects: num("totalProjects", "total_projects"),
      totalTasks: num("totalTasks", "total_tasks"),
      completedTasks: num("completedTasks", "completed_tasks"),
      pendingTasks: num("pendingTasks", "pending_tasks"),
      projectsInProgress: num("projectsInProgress", "projects_in_progress"),
    };
  };

  it("correctly unwraps GET /api/dashboard envelope with camelCase properties (1 project)", () => {
    const apiEnvelope = {
      success: true,
      data: {
        totalProjects: 1,
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        projectsInProgress: 0,
      },
    };

    const unwrapped = unwrap<DashboardStats>(apiEnvelope, "dashboard", "stats");
    expect(unwrapped).toEqual({
      totalProjects: 1,
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
      projectsInProgress: 0,
    });

    const cards = mapDashboardCards(unwrapped);
    expect(cards.totalProjects).toBe(1);
    expect(cards.totalTasks).toBe(0);
    expect(cards.completedTasks).toBe(0);
    expect(cards.pendingTasks).toBe(0);
    expect(cards.projectsInProgress).toBe(0);
  });

  it("correctly maps dynamic counts for multiple projects and tasks (e.g. 2 projects, 5 tasks)", () => {
    const apiEnvelope = {
      success: true,
      data: {
        totalProjects: 2,
        totalTasks: 5,
        completedTasks: 3,
        pendingTasks: 2,
        projectsInProgress: 1,
      },
    };

    const unwrapped = unwrap<DashboardStats>(apiEnvelope, "dashboard", "stats");
    const cards = mapDashboardCards(unwrapped);

    expect(cards.totalProjects).toBe(2);
    expect(cards.totalTasks).toBe(5);
    expect(cards.completedTasks).toBe(3);
    expect(cards.pendingTasks).toBe(2);
    expect(cards.projectsInProgress).toBe(1);
  });

  it("reflects server state across project creation and deletion lifecycle (0 -> 1 -> 2 -> 1)", () => {
    // 1. Initial State: 0 projects
    const state0 = unwrap<DashboardStats>({
      success: true,
      data: { totalProjects: 0, totalTasks: 0, completedTasks: 0, pendingTasks: 0, projectsInProgress: 0 },
    });
    expect(mapDashboardCards(state0).totalProjects).toBe(0);

    // 2. After Project 1 created
    const state1 = unwrap<DashboardStats>({
      success: true,
      data: { totalProjects: 1, totalTasks: 0, completedTasks: 0, pendingTasks: 0, projectsInProgress: 0 },
    });
    expect(mapDashboardCards(state1).totalProjects).toBe(1);

    // 3. After Project 2 created
    const state2 = unwrap<DashboardStats>({
      success: true,
      data: { totalProjects: 2, totalTasks: 0, completedTasks: 0, pendingTasks: 0, projectsInProgress: 0 },
    });
    expect(mapDashboardCards(state2).totalProjects).toBe(2);

    // 4. After Project deleted
    const state3 = unwrap<DashboardStats>({
      success: true,
      data: { totalProjects: 1, totalTasks: 0, completedTasks: 0, pendingTasks: 0, projectsInProgress: 0 },
    });
    expect(mapDashboardCards(state3).totalProjects).toBe(1);
  });

  it("handles empty / missing stats gracefully with fallback to 0", () => {
    const cards = mapDashboardCards(undefined);

    expect(cards.totalProjects).toBe(0);
    expect(cards.totalTasks).toBe(0);
    expect(cards.completedTasks).toBe(0);
    expect(cards.pendingTasks).toBe(0);
    expect(cards.projectsInProgress).toBe(0);
  });
});
