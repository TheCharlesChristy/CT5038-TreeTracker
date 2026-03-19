export type UserRole = 'user' | 'guardian' | 'admin';

export type SessionUser = {
  id: number;
  name: string;
  role: UserRole;
};

const CURRENT_SESSION_USER: SessionUser = {
  id: 1,
  name: 'Demo User',
  role: 'user',
};

export function getSessionUser(): SessionUser {
  return CURRENT_SESSION_USER;
}

export function canAccessMyTrees(role: UserRole): boolean {
  return role === 'guardian' || role === 'admin';
}

export function canAccessManageUsers(role: UserRole): boolean {
  return role === 'admin';
}
