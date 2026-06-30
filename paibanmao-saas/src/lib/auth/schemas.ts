import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(32),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1).max(128),
});

export const emailSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
});

export const tokenSchema = z.object({
  token: z.string().trim().min(20).max(256),
});

export const passwordResetSchema = z.object({
  token: z.string().trim().min(20).max(256),
  password: z.string().min(8).max(128),
});
