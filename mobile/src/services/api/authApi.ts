import { apiClient } from './client';
import {
  LoginPayload,
  RegisterPayload,
  User,
  ApiResponse,
} from '../../types';

export const authApi = {
  /**
   * POST /api/auth/register
   */
  async register(payload: RegisterPayload): Promise<ApiResponse<User>> {
    return apiClient.post<User>('/auth/register', payload, { skipAuth: true });
  },

  /**
   * POST /api/auth/login
   */
  async login(payload: LoginPayload): Promise<ApiResponse<User>> {
    return apiClient.post<User>('/auth/login', payload, { skipAuth: true });
  },

  /**
   * POST /api/auth/logout
   */
  async logout(): Promise<ApiResponse<null>> {
    return apiClient.post<null>('/auth/logout');
  },

  /**
   * GET /api/auth/me
   */
  async getMe(): Promise<ApiResponse<User>> {
    return apiClient.get<User>('/auth/me');
  },
};
