import { apiClient } from './client';
import {
  Project,
  CreateProjectPayload,
  UpdateProjectPayload,
  ProjectQueryParams,
  ApiResponse,
} from '../../types';

export const projectApi = {
  /**
   * GET /api/projects
   */
  async getProjects(params?: ProjectQueryParams): Promise<ApiResponse<Project[]>> {
    return apiClient.get<Project[]>('/projects', params);
  },

  /**
   * GET /api/projects/:id
   */
  async getProjectById(id: string): Promise<ApiResponse<Project>> {
    return apiClient.get<Project>(`/projects/${id}`);
  },

  /**
   * POST /api/projects
   */
  async createProject(payload: CreateProjectPayload): Promise<ApiResponse<Project>> {
    return apiClient.post<Project>('/projects', payload);
  },

  /**
   * PUT /api/projects/:id
   */
  async updateProject(id: string, payload: UpdateProjectPayload): Promise<ApiResponse<Project>> {
    return apiClient.put<Project>(`/projects/${id}`, payload);
  },

  /**
   * DELETE /api/projects/:id
   */
  async deleteProject(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete<null>(`/projects/${id}`);
  },
};
