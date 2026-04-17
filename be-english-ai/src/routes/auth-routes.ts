import { Router } from "express";
import {
  currentUserHandler,
  googleAuthCallbackHandler,
  googleAuthStartHandler,
  healthHandler,
  loginHandler,
  oauthLoginHandler,
  registerHandler,
  uploadAvatarHandler,
} from "../controllers/auth/auth-controller";
import { requireAuth } from "../middlewares/require-auth";
import { upload } from "../middlewares/upload";
import { validateBody } from "../middlewares/validate-body";
import {
  loginRequestSchema,
  oauthLoginRequestSchema,
  registerRequestSchema,
} from "../schemas/auth-schemas";
import { asyncHandler } from "../utils/async-handler";

export const authRoutes = Router();

authRoutes.get("/google", googleAuthStartHandler);
authRoutes.get("/google/callback", asyncHandler(googleAuthCallbackHandler));

authRoutes.post("/register", validateBody(registerRequestSchema), asyncHandler(registerHandler));
authRoutes.post(
  "/login",
  (req, _res, next) => {
    if (req.body?.identity && !req.body?.emailOrUsername) {
      req.body.emailOrUsername = req.body.identity;
    }

    next();
  },
  validateBody(loginRequestSchema),
  asyncHandler(loginHandler),
);
authRoutes.post(
  "/oauth-login",
  validateBody(oauthLoginRequestSchema),
  asyncHandler(oauthLoginHandler),
);
authRoutes.get("/me", requireAuth, asyncHandler(currentUserHandler));
authRoutes.post("/avatar", requireAuth, upload.single("avatar"), asyncHandler(uploadAvatarHandler));
authRoutes.get("/health", healthHandler);
