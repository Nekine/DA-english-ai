import { useAuth } from '@/components/AuthContext';

/**
 * Compatibility hook for parts of the UI still calling the old integration API.
 * OAuth Google flow is now handled by backend redirects and callback page.
 */
export const useAuth0Integration = () => {
  const { logout: localLogout, user: localUser } = useAuth();

  const handleLogout = async () => {
    localLogout();
  };

  return {
    isLoading: false,
    isAuthenticated: Boolean(localUser),
    auth0User: null,
    localUser,
    handleLogout,
    error: null,
  };
};
