import { z } from "zod";

/** Digits only, optional leading +, 8–15 digits (E.164-friendly subset). */
export const phoneSchema = z
  .string()
  .trim()
  .min(8, "Phone number is too short")
  .max(20, "Phone number is too long")
  .transform((s) => s.replace(/[\s-]/g, ""))
  .refine((s) => /^\+?[0-9]{8,15}$/.test(s), "Enter a valid mobile number");

export const optionalPhoneSchema = z
  .string()
  .trim()
  .optional()
  .transform((s, ctx) => {
    if (s === undefined) return undefined;
    if (s === "") return null;
    const normalized = s.replace(/[\s-]/g, "");
    if (!/^\+?[0-9]{8,15}$/.test(normalized)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid mobile number" });
      return z.NEVER;
    }
    return normalized;
  });
