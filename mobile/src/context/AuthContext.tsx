import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginPayload, RegisterPayload, AuthState } from '../types';
import { authApi } from '../services/api/authApi';
import { apiClient } from '../services/api/client';
import { storage } from '../utils/storage';

interface AuthContextType extends AuthState {
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const clearError = () => {
    setState((prev) => ({ ...prev, error: null }));
  };

  /**
   * Restores user session on app launch from stored JWT token
   */
  const restoreSession = async () => {
    let storedToken: string | null = null;
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      storedToken = await storage.getAuthToken();

      if (!storedToken) {
        setState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
        return;
      }

      // Verify token with backend /api/auth/me
      const response = await authApi.getMe();

      if (response.success && response.data) {
        setState({
          user: response.data,
          token: storedToken,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        await storage.removeAuthToken();
        setState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    } catch (error: any) {
      console.log('[AuthContext] Session restore note:', error.message);
      // Only purge the stored token if the server explicitly rejected it with 401/403
      if (error.status === 401 || error.status === 403) {
        await storage.removeAuthToken();
      }
      setState({
        user: null,
        token: error.status === 401 || error.status === 403 ? null : storedToken,
        isAuthenticated: false,
        isLoading: false,
        error: error.status === 401 || error.status === 403 ? null : error.message,
      });
    }
  };

  useEffect(() => {
    // Register global 401 session expiration callback from API client
    apiClient.setOnUnauthorized(async (message) => {
      console.log('[AuthContext] Global 401 Session Expiration triggered:', message);
      await storage.removeAuthToken();
      setState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: message || 'Your session has expired. Please log in again.',
      });
    });

    restoreSession();
  }, []);

  /**
   * Authenticate user with email and password
   */
  const login = async (payload: LoginPayload) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const response = await authApi.login(payload);

      if (response.success && response.token) {
        await storage.setAuthToken(response.token);
        setState({
          user: response.data,
          token: response.token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to log in',
      }));
      throw error;
    }
  };

  /**
   * Register a new user account
   */
  const register = async (payload: RegisterPayload) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const response = await authApi.register(payload);

      if (response.success) {
        // Automatically login after successful registration
        await login({ email: payload.email, password: payload.password });
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to register',
      }));
      throw error;
    }
  };

  /**
   * Log out user and purge stored token
   */
  const logout = async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      try {
        await authApi.logout();
      } catch (err) {
        // Continue clearing local state even if network call fails
      }
      await storage.removeAuthToken();
      setState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      await storage.removeAuthToken();
      setState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        restoreSession,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
