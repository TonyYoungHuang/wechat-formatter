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

