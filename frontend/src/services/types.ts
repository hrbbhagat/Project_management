export type SortOrder = "ASC" | "DESC" | "asc" | "desc";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface ProjectFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  order?: SortOrder;
}

export interface TaskFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  project_id?: string;
  assigned_to?: string;
  sortBy?: string;
  order?: SortOrder;
}
