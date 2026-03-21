import { useRedirectIfAuthenticated } from '@/hooks/useRedirectIfAuthenticated';

type AuthenticatedRedirectProps = {
  redirectTo?: string;
};

export function AuthenticatedRedirect({
  redirectTo = '/mainPage',
}: AuthenticatedRedirectProps) {
  useRedirectIfAuthenticated(redirectTo);
  return null;
}
