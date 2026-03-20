import { useEffect, useState } from 'react';
import { getCurrentUser, type AuthUser, type UserRole } from '@/utilities/authHelper';

export type SessionUser = AuthUser;

export async function getSessionUser(): Promise<SessionUser | null> {
  return getCurrentUser();
}

export function useSessionUser() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      try {
        const nextUser = await getCurrentUser();
        if (active) {
          setUser(nextUser);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadUser();

    return () => {
      active = false;
    };
  }, []);

  return {
    user,
    isLoading
  };
}

export function canAccessMyTrees(role: UserRole | null | undefined): boolean {
  return role === 'guardian' || role === 'admin';
}

export function canAccessManageUsers(role: UserRole | null | undefined): boolean {
  return role === 'admin';
}
