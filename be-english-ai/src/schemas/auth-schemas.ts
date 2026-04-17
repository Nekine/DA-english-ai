import { z } from "zod";

const passwordPolicyRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const cefrLevelSchema = z.enum(["unknown", "A1", "A2", "B1", "B2", "C1", "C2"]);

export const registerRequestSchema = z.object({
  email: z.email("Invalid email format").transform((v) => v.trim()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      passwordPolicyRegex,
      "Password must contain uppercase, lowercase, number and special character",
    ),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(100, "Username cannot exceed 100 characters"),
  fullName: z.string().trim().min(1, "Full name is required").max(255),
  currentLevel: cefrLevelSchema.default("unknown"),
});

export const loginRequestSchema = z.object({
  emailOrUsername: z.string().trim().min(1, "Email or Username is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false),
});

export const oauthLoginRequestSchema = z.object({
  provider: z.enum(["google"]),
  providerId: z.string().trim().min(1, "ProviderId is required"),
  email: z.email("Invalid email format"),
  fullName: z.string().trim().optional(),
  avatar: z.string().trim().optional(),
});

export type RegisterRequestDto = z.infer<typeof registerRequestSchema>;
export type LoginRequestDto = z.infer<typeof loginRequestSchema>;
export type OAuthLoginRequestDto = z.infer<typeof oauthLoginRequestSchema>;
