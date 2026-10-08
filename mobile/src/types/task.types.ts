import { PaginationParams } from './api.types';

export type TaskStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'TODO'
  | 'IN_REVIEW'
  | 'DONE'
  | 'BLOCKED';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Task {
  id: string;
  project_id: string;
  project_name?: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: string | null;
  assignee_name?: string | null;
  assignee_email?: string | null;
  created_by: string;
  creator_name?: string;
  due_date: string | null;
  estimated_hours: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskPayload {
  project_id: string;
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: string | null;
  due_date?: string | null;
  estimated_hours?: number | null;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: string | null;
  due_date?: string | null;
  estimated_hours?: number | null;
}

export interface TaskQueryParams extends PaginationParams {
  project_id?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: string;
}
