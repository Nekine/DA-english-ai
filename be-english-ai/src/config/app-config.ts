import { loadEnv } from "./env";

const env = loadEnv();

export const appConfig = {
  env: env.NODE_ENV,
  port: env.PORT,
  jwt: {
    secret: env.JWT_SECRET,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    expireMinutes: env.JWT_EXPIRE_MINUTES,
  },
  db: {
    enabled: env.DB_ENABLED,
    url: env.DB_URL,
  },
  oauth: {
    google: {
      clientId: env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      redirectUri: env.GOOGLE_OAUTH_REDIRECT_URI,
      frontendRedirectUri: env.GOOGLE_OAUTH_FRONTEND_REDIRECT_URI,
    },
  },
  payos: {
    clientId: env.PAYOS_CLIENT_ID,
    apiKey: env.PAYOS_API_KEY,
    checksumKey: env.PAYOS_CHECKSUM_KEY,
    returnUrl: env.PAYOS_RETURN_URL,
    cancelUrl: env.PAYOS_CANCEL_URL,
  },
} as const;
