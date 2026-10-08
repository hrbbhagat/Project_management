import { Platform } from 'react-native';

/**
 * Global Configuration for Mobile Application
 *
 * NOTE ON ANDROID NETWORKING:
 * - Android Emulator maps the host machine's localhost to 10.0.2.2.
 * - Physical Android devices require your computer's local network IP (e.g. http://192.168.1.50:5001/api).
 * - You can override this at any time by setting EXPO_PUBLIC_API_URL in .env
 */

const getApiBaseUrl = (): string => {
  // If explicitly provided in environment, use it directly
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Deployed production Render backend
  return 'https://project-management-backend-7atu.onrender.com/api';
};

export const Config = {
  APP_NAME: 'Taskline Mobile',
  VERSION: '1.0.0',
  API_BASE_URL: getApiBaseUrl(),
  STORAGE_KEYS: {
    AUTH_TOKEN: 'taskline_auth_token',
    USER_DATA: 'taskline_user_data',
    THEME: 'taskline_theme',
  },
  DEFAULT_PAGE_SIZE: 10,
  REQUEST_TIMEOUT_MS: 15000,
};
