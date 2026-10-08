import { request, unwrap } from "./api";
import type { DashboardStats, Project, Task, User } from "@/types";
import type { PaginatedResponse, PaginationMeta, ProjectFilters, TaskFilters } from "./types";

export type { PaginatedResponse, PaginationMeta, ProjectFilters, TaskFilters };

// ---------- Real Express Backend API Services ----------
export const authApi = {
  async login(payload: { email: string; password: string }) {
    const body: any = await request("/api/auth/login", { method: "POST", body: payload });
    const user: User | undefined = body?.data ?? body?.user;
    if (user && !user.name && (user as any).full_name) {
      user.name = (user as any).full_name;
    }
    const token: string | undefined = body?.token ?? body?.data?.token;
    return { token, user };
  },
  async register(payload: { full_name: string; email: string; password: string }) {
    const body: any = await request("/api/auth/register", { method: "POST", body: payload });
    const user: User | undefined = body?.data ?? body?.user;
    if (user && !user.name && (user as any).full_name) {
      user.name = (user as any).full_name;
    }
    const token: string | undefined = body?.token ?? body?.data?.token;
    return { token, user };
  },
  logout: () => request("/api/auth/logout", { method: "POST" }),
  async me(): Promise<User> {
    const body: any = await request("/api/auth/me");
    const user = unwrap<User>(body, "user");
    if (user && !user.name && (user as any).full_name) {
      user.name = (user as any).full_name;
    }
    return user;
  },
};

export const projectApi = {
  list: async (q: ProjectFilters = {}): Promise<PaginatedResponse<Project>> => {
    const body: any = await request("/api/projects", { query: q as Record<string, string | number | boolean | undefined> });
    const rawData = body?.data;
    const data: Project[] = Array.isArray(rawData) ? rawData : [];
    const pagination: PaginationMeta = body?.pagination ?? {
      page: q.page || 1,
      limit: q.limit || 10,
      total: data.length,
      totalPages: Math.ceil(data.length / (q.limit || 10)) || 1,
      hasNextPage: false,
      hasPreviousPage: false,
    };
    return { data, pagination };
  },
  get: async (id: string | number) => unwrap<Project>(await request(`/api/projects/${id}`), "project"),
  create: async (p: Partial<Project>) => unwrap<Project>(await request("/api/projects", { method: "POST", body: p }), "project"),
  update: async (id: string | number, p: Partial<Project>) =>
    unwrap<Project>(await request(`/api/projects/${id}`, { method: "PUT", body: p }), "project"),
  remove: (id: string | number) => request(`/api/projects/${id}`, { method: "DELETE" }),
};

export const taskApi = {
  list: async (q: TaskFilters = {}): Promise<PaginatedResponse<Task>> => {
    const body: any = await request("/api/tasks", { query: q as Record<string, string | number | boolean | undefined> });
    const rawData = body?.data;
    const data: Task[] = Array.isArray(rawData) ? rawData : [];
    const pagination: PaginationMeta = body?.pagination ?? {
      page: q.page || 1,
      limit: q.limit || 10,
      total: data.length,
      totalPages: Math.ceil(data.length / (q.limit || 10)) || 1,
      hasNextPage: false,
      hasPreviousPage: false,
    };
    return { data, pagination };
  },
  get: async (id: string | number) => unwrap<Task>(await request(`/api/tasks/${id}`), "task"),
  create: async (t: Partial<Task>) => unwrap<Task>(await request("/api/tasks", { method: "POST", body: t }), "task"),
  update: async (id: string | number, t: Partial<Task>) =>
    unwrap<Task>(await request(`/api/tasks/${id}`, { method: "PUT", body: t }), "task"),
  remove: (id: string | number) => request(`/api/tasks/${id}`, { method: "DELETE" }),
};

export const dashboardApi = {
  get: async (): Promise<DashboardStats> =>
    unwrap<DashboardStats>(await request("/api/dashboard"), "dashboard", "stats"),
};

// Export real services directly
export const authService = authApi;
export const projectService = projectApi;
export const taskService = taskApi;
export const dashboardService = dashboardApi;
