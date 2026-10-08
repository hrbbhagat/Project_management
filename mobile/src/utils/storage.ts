import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { Config } from '../constants/config';

/**
 * Mobile Secure Storage Utility
 * Encapsulates expo-secure-store for hardware-backed keystore/keychain storage.
 */

// Memory fallback for web preview or test environments
const memoryStorage = new Map<string, string>();

export const storage = {
  /**
   * Save a key-value pair to secure device storage
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        memoryStorage.set(key, value);
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.warn(`[SecureStore] Failed to save key "${key}":`, error);
      memoryStorage.set(key, value);
    }
  },

  /**
   * Retrieve a value from secure device storage
   */
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        const mem = memoryStorage.get(key);
        if (mem) return mem;
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return null;
      }
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.warn(`[SecureStore] Failed to read key "${key}":`, error);
      return memoryStorage.get(key) || null;
    }
  },

  /**
   * Remove a key from secure device storage
   */
  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        memoryStorage.delete(key);
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.warn(`[SecureStore] Failed to delete key "${key}":`, error);
      memoryStorage.delete(key);
    }
  },

  /**
   * Helper to store the JWT Auth Token
   */
  async setAuthToken(token: string): Promise<void> {
    await this.setItem(Config.STORAGE_KEYS.AUTH_TOKEN, token);
  },

  /**
   * Helper to get the JWT Auth Token
   */
  async getAuthToken(): Promise<string | null> {
    return await this.getItem(Config.STORAGE_KEYS.AUTH_TOKEN);
  },

  /**
   * Helper to clear the JWT Auth Token
   */
  async removeAuthToken(): Promise<void> {
    await this.removeItem(Config.STORAGE_KEYS.AUTH_TOKEN);
  },
};

/**
 * Direct helper methods for JWT token management
 */
export const saveToken = async (token: string): Promise<void> => {
  await storage.setAuthToken(token);
};

export const getToken = async (): Promise<string | null> => {
  return await storage.getAuthToken();
};

export const removeToken = async (): Promise<void> => {
  await storage.removeAuthToken();
};

export const hasToken = async (): Promise<boolean> => {
  const token = await storage.getAuthToken();
  return Boolean(token && token.trim().length > 0);
};
