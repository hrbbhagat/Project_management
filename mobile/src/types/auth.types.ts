export type UserRole = 'ADMIN' | 'MEMBER';

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url?: string | null;
  is_active?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface RegisterPayload {
  full_name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  data: User;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
