import { apiClient } from './client';
import {
  Task,
  CreateTaskPayload,
  UpdateTaskPayload,
  TaskQueryParams,
  ApiResponse,
} from '../../types';

export const taskApi = {
  /**
   * GET /api/tasks
   */
  async getTasks(params?: TaskQueryParams): Promise<ApiResponse<Task[]>> {
    return apiClient.get<Task[]>('/tasks', params);
  },

  /**
   * GET /api/tasks/:id
   */
  async getTaskById(id: string): Promise<ApiResponse<Task>> {
    return apiClient.get<Task>(`/tasks/${id}`);
  },

  /**
   * POST /api/tasks
   */
  async createTask(payload: CreateTaskPayload): Promise<ApiResponse<Task>> {
    return apiClient.post<Task>('/tasks', payload);
  },

  /**
   * PUT /api/tasks/:id
   */
  async updateTask(id: string, payload: UpdateTaskPayload): Promise<ApiResponse<Task>> {
    return apiClient.put<Task>(`/tasks/${id}`, payload);
  },

  /**
   * DELETE /api/tasks/:id
   */
  async deleteTask(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete<null>(`/tasks/${id}`);
  },
};
