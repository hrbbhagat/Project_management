import { apiClient } from './client';
import { DashboardMetrics, ApiResponse } from '../../types';

export const dashboardApi = {
  /**
   * GET /api/dashboard
   */
  async getDashboardMetrics(): Promise<ApiResponse<DashboardMetrics>> {
    return apiClient.get<DashboardMetrics>('/dashboard');
  },
};
