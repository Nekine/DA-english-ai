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
} as const;
