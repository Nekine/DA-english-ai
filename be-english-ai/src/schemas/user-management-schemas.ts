import { z } from "zod";

export const userManagementCreateUserSchema = z.object({
  username: z.string().trim().min(1).optional(),
  userName: z.string().trim().min(1).optional(),
  email: z.email("Invalid email format"),
  fullName: z.string().trim().min(1),
  level: z.string().trim().optional(),
  preferredLevel: z.string().trim().optional().default("Beginner"),
  isActive: z.boolean().optional(),
  status: z.enum(["Active", "Inactive"]).optional().default("Active"),
  totalXP: z.int().nonnegative().optional().default(0),
});

export const userManagementUpdateUserSchema = z.object({
  username: z.string().trim().min(1).optional(),
  userName: z.string().trim().min(1).optional(),
  email: z.email("Invalid email format"),
  fullName: z.string().trim().min(1),
  level: z.string().trim().optional(),
  preferredLevel: z.string().trim().optional().default("Beginner"),
  isActive: z.boolean().optional(),
  status: z.enum(["Active", "Inactive"]).optional().default("Active"),
  totalXP: z.int().nonnegative().optional().default(0),
});

export type UserManagementCreateUserDto = z.infer<typeof userManagementCreateUserSchema>;
export type UserManagementUpdateUserDto = z.infer<typeof userManagementUpdateUserSchema>;
