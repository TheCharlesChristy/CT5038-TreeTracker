import { useEffect } from 'react';
import { router } from 'expo-router';
import { useSessionUser } from '@/lib/session';

export function useRedirectIfAuthenticated(redirectTo = '/mainPage') {
  const { user, isLoading } = useSessionUser();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(redirectTo as never);
    }
  }, [isLoading, redirectTo, user]);

  return {
    isCheckingSession: isLoading,
    isAuthenticated: Boolean(user),
    user,
  };
}
