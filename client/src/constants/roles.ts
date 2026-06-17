import type { User, UserRole } from '../types';

export const ROLES: Record<string, UserRole> = {
  ADMIN: 'Admin',
  MEMBER: 'Member',
};

export const isAdmin = (user: User | null | undefined): boolean => {
  return user?.role === ROLES.ADMIN;
};

export const isMember = (user: User | null | undefined): boolean => {
  return user?.role === ROLES.MEMBER;
};
