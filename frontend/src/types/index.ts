// Field names mirror the backend/database columns. Optional because
// not every endpoint returns every field.
export type ID = string | number;

export interface User {
  id: ID;
  name?: string;
  email: string;
  role?: string;
  [key: string]: unknown;
}

export interface Project {
  id: ID;
  name: string;
  description?: string | null;
  status?: string;
  start_date?: string | null;
  due_date?: string | null;
  owner_id?: ID;
  owner_name?: string;
  created_at?: string;
  progress?: number;
  [key: string]: unknown;
}

export interface Task {
  id: ID;
  title: string;
  description?: string | null;
  status?: string;
  priority?: string;
  due_date?: string | null;
  assigned_to?: ID | null;
  assigned_to_name?: string;
  created_by?: ID;
  project_id?: ID;
  project_name?: string;
  [key: string]: unknown;
}
