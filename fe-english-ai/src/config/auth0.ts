// Export Auth0 configuration read from Vite environment variables
// These should be defined in a .env (not committed) or provided by your hosting provider.

export const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN ?? '';
export const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID ?? '';
export const AUTH0_REDIRECT_URI = import.meta.env.VITE_AUTH0_REDIRECT_URI ?? window.location.origin;

export default {
  domain: AUTH0_DOMAIN,
  clientId: AUTH0_CLIENT_ID,
  redirectUri: AUTH0_REDIRECT_URI,
};
