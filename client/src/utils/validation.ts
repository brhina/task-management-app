import type { PasswordStrength, PasswordStrengthLabel } from '../types';

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): PasswordStrength => {
  const minLength = password.length >= 6;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const strength: PasswordStrength = {
    score: 0,
    feedback: [],
  };

  if (minLength) strength.score++;
  else strength.feedback.push('At least 6 characters');

  if (hasUpperCase) strength.score++;
  else strength.feedback.push('One uppercase letter');

  if (hasLowerCase) strength.score++;
  else strength.feedback.push('One lowercase letter');

  if (hasNumber) strength.score++;
  else strength.feedback.push('One number');

  if (hasSpecialChar) strength.score++;
  else strength.feedback.push('One special character');

  return strength;
};

export const getPasswordStrengthLabel = (strength: PasswordStrength): PasswordStrengthLabel => {
  if (strength.score <= 2) return { label: 'Weak', color: 'text-red-600', bgColor: 'bg-red-100' };
  if (strength.score <= 3)
    return { label: 'Fair', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
  if (strength.score <= 4) return { label: 'Good', color: 'text-blue-600', bgColor: 'bg-blue-100' };
  return { label: 'Strong', color: 'text-green-600', bgColor: 'bg-green-100' };
};

export const validateURL = (url: string): boolean => {
  if (!url) return true;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};
