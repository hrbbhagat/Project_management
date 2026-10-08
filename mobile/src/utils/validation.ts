/**
 * Common input validation functions for mobile forms
 */

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailRegex.test(email.trim());
};

export const isValidPassword = (password: string): boolean => {
  return password.length >= 8;
};

export const isNotEmpty = (val: string | null | undefined): boolean => {
  return typeof val === 'string' && val.trim().length > 0;
};
