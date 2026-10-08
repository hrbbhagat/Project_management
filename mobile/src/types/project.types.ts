import { PaginationParams } from './api.types';

export type ProjectStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'PLANNING'
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'ARCHIVED';

export type ProjectRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  owner_id: string;
  owner_name?: string;
  owner_email?: string;
  user_role?: ProjectRole | null;
  start_date: string | null;
  due_date: string | null;
  total_members?: number;
  total_tasks?: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  role: ProjectRole;
  joined_at: string;
}

export interface CreateProjectPayload {
  name: string;
  description?: string | null;
  status?: ProjectStatus;
  start_date?: string | null;
  due_date?: string | null;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string | null;
  status?: ProjectStatus;
  start_date?: string | null;
  due_date?: string | null;
}

export interface ProjectQueryParams extends PaginationParams {
  status?: ProjectStatus;
}
