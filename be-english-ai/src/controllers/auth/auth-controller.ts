import type { Request, Response } from "express";
import path from "node:path";
import { promises as fs } from "node:fs";
import { createHmac, timingSafeEqual } from "node:crypto";
import { HTTP_STATUS } from "../../constants/http-status";
import { appConfig } from "../../config";
import { AppError } from "../../errors/app-error";
import { ERROR_CODES } from "../../errors/error-codes";
import {
  getUserById,
  login,
  oauthLogin,
  register,
  updateCurrentUserAvatar,
  type OAuthLoginRequest,
  type RegisterRequest,
} from "../../services/auth/auth-service";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const GOOGLE_OAUTH_SCOPE = "openid email profile";
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

interface GoogleTokenResponse {
  access_token: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

interface OAuthStatePayload {
  frontendRedirectUri: string;
  ts: number;
}

const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

function getAllowedFrontendOrigin(): string {
  try {
    return new URL(appConfig.oauth.google.frontendRedirectUri).origin;
  } catch {
    return "http://localhost:5173";
  }
}

function sanitizeFrontendRedirectUri(input?: string | null): string {
  const fallback = appConfig.oauth.google.frontendRedirectUri;
  if (!input || input.trim().length === 0) {
    return fallback;
  }

  try {
    const candidate = new URL(input);
    const allowedOrigin = getAllowedFrontendOrigin();
    if (candidate.origin !== allowedOrigin) {
      return fallback;
    }

    return candidate.toString();
  } catch {
    return fallback;
  }
}

function signState(payloadBase64Url: string): string {
  return createHmac("sha256", appConfig.jwt.secret).update(payloadBase64Url).digest("base64url");
}

function buildOAuthState(frontendRedirectUri: string): string {
  const payload: OAuthStatePayload = {
    frontendRedirectUri,
    ts: Date.now(),
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signState(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function parseOAuthState(state: string): OAuthStatePayload {
  const [encodedPayload, receivedSignature] = state.split(".");
  if (!encodedPayload || !receivedSignature) {
    throw new AppError(
      "Invalid OAuth state",
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  const expectedSignature = signState(encodedPayload);
  const receivedBuffer = Buffer.from(receivedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    receivedBuffer.length !== expectedBuffer.length
    || !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    throw new AppError(
      "Invalid OAuth state signature",
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  const payloadRaw = Buffer.from(encodedPayload, "base64url").toString("utf8");
  const payload = JSON.parse(payloadRaw) as Partial<OAuthStatePayload>;

  if (!payload.frontendRedirectUri || typeof payload.ts !== "number") {
    throw new AppError(
      "Invalid OAuth state payload",
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  if (Date.now() - payload.ts > OAUTH_STATE_TTL_MS) {
    throw new AppError(
      "OAuth state expired",
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  return {
    frontendRedirectUri: sanitizeFrontendRedirectUri(payload.frontendRedirectUri),
    ts: payload.ts,
  };
}

function appendErrorToRedirectUrl(baseUrl: string, message: string): string {
  const redirectUrl = new URL(baseUrl);
  redirectUrl.searchParams.set("error", message);
  return redirectUrl.toString();
}

function appendSuccessToRedirectUrl(baseUrl: string, token: string, user: unknown): string {
  const redirectUrl = new URL(baseUrl);
  redirectUrl.searchParams.set("token", token);
  redirectUrl.searchParams.set(
    "user",
    Buffer.from(JSON.stringify(user), "utf8").toString("base64url"),
  );
  return redirectUrl.toString();
}

async function exchangeGoogleCodeForAccessToken(code: string): Promise<string> {
  const body = new URLSearchParams({
    code,
    client_id: appConfig.oauth.google.clientId,
    client_secret: appConfig.oauth.google.clientSecret,
    redirect_uri: appConfig.oauth.google.redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const data = (await response.json().catch(() => ({}))) as Partial<GoogleTokenResponse>;
  if (!response.ok || !data.access_token) {
    throw new Error("Google token exchange failed");
  }

  return data.access_token;
}

async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = (await response.json().catch(() => ({}))) as Partial<GoogleUserInfo>;
  if (!response.ok || !data.sub || !data.email) {
    throw new Error("Google user info retrieval failed");
  }

  return {
    sub: data.sub,
    email: data.email,
    ...(data.name ? { name: data.name } : {}),
    ...(data.picture ? { picture: data.picture } : {}),
  };
}

async function saveAvatarFile(userId: number, file: Express.Multer.File): Promise<string> {
  const ext = ALLOWED_MIME_TO_EXT[file.mimetype];
  if (!ext) {
    throw new AppError(
      "Invalid image format. Allowed: JPG, PNG, WEBP, GIF",
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  const imagesDir = path.resolve(process.cwd(), "images");
  await fs.mkdir(imagesDir, { recursive: true });

  const fileName = `avatar-${userId}-${Date.now()}${ext}`;
  const filePath = path.join(imagesDir, fileName);
  await fs.writeFile(filePath, file.buffer);

  return `/images/${fileName}`;
}

export async function registerHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as RegisterRequest;

  const result = await register(body);
  res.status(result.success ? HTTP_STATUS.OK : HTTP_STATUS.BAD_REQUEST).json(result);
}

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    emailOrUsername: string;
    password: string;
    rememberMe?: boolean;
  };

  const result = await login({
    emailOrUsername: body.emailOrUsername,
    password: body.password,
    rememberMe: body.rememberMe ?? false,
  });

  res.status(result.success ? HTTP_STATUS.OK : HTTP_STATUS.UNAUTHORIZED).json(result);
}

export async function oauthLoginHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as OAuthLoginRequest;

  const result = await oauthLogin(body);
  res.status(result.success ? HTTP_STATUS.OK : HTTP_STATUS.BAD_REQUEST).json(result);
}

export function googleAuthStartHandler(req: Request, res: Response): void {
  const redirectQuery = typeof req.query.redirect === "string" ? req.query.redirect : null;
  const frontendRedirectUri = sanitizeFrontendRedirectUri(redirectQuery);
  const state = buildOAuthState(frontendRedirectUri);

  const params = new URLSearchParams({
    client_id: appConfig.oauth.google.clientId,
    redirect_uri: appConfig.oauth.google.redirectUri,
    response_type: "code",
    scope: GOOGLE_OAUTH_SCOPE,
    prompt: "select_account",
    state,
  });

  res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
}

export async function googleAuthCallbackHandler(req: Request, res: Response): Promise<void> {
  let frontendRedirectUri = appConfig.oauth.google.frontendRedirectUri;

  try {
    const state = typeof req.query.state === "string" ? req.query.state : "";
    if (state) {
      frontendRedirectUri = parseOAuthState(state).frontendRedirectUri;
    }
  } catch {
    const errorRedirect = appendErrorToRedirectUrl(frontendRedirectUri, "Invalid OAuth state");
    res.redirect(errorRedirect);
    return;
  }

  const providerError = typeof req.query.error === "string" ? req.query.error : "";
  if (providerError) {
    res.redirect(appendErrorToRedirectUrl(frontendRedirectUri, "Google authentication failed"));
    return;
  }

  const code = typeof req.query.code === "string" ? req.query.code : "";
  if (!code) {
    res.redirect(appendErrorToRedirectUrl(frontendRedirectUri, "Missing OAuth authorization code"));
    return;
  }

  try {
    const accessToken = await exchangeGoogleCodeForAccessToken(code);
    const googleUser = await fetchGoogleUserInfo(accessToken);

    const result = await oauthLogin({
      provider: "google",
      providerId: googleUser.sub,
      email: googleUser.email,
      fullName: googleUser.name ?? null,
      avatar: googleUser.picture ?? null,
    });

    if (!result.success || !result.token || !result.user) {
      res.redirect(
        appendErrorToRedirectUrl(frontendRedirectUri, result.message || "Google login failed"),
      );
      return;
    }

    res.redirect(appendSuccessToRedirectUrl(frontendRedirectUri, result.token, result.user));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google login failed";
    res.redirect(appendErrorToRedirectUrl(frontendRedirectUri, message));
  }
}

export async function currentUserHandler(req: Request, res: Response): Promise<void> {
  const userId = Number(req.auth?.sub ?? 0);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new AppError("Invalid or missing token", HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.AUTH_REQUIRED);
  }

  const user = await getUserById(userId);
  if (!user) {
    throw new AppError("User not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  res.status(HTTP_STATUS.OK).json({ success: true, user });
}

export async function uploadAvatarHandler(req: Request, res: Response): Promise<void> {
  const userId = Number(req.auth?.sub ?? 0);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new AppError("Invalid or missing token", HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.AUTH_REQUIRED);
  }

  if (!req.file || !req.file.buffer) {
    throw new AppError("No avatar file uploaded", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
  }

  const avatarUrl = await saveAvatarFile(userId, req.file);
  const user = await updateCurrentUserAvatar(userId, avatarUrl);

  if (!user) {
    throw new AppError("User not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: "Avatar updated successfully",
    avatarUrl,
    user,
  });
}

export function healthHandler(_req: Request, res: Response): void {
  res.status(HTTP_STATUS.OK).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
}
