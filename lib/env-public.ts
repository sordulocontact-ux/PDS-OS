import { z } from "zod";

/**
 * Public environment variables — inlined into the browser bundle at build time.
 * Never put a secret here.
 */
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().trim().min(1),
  /** Base URL of the app, used to build auth email links. Never read from request headers. */
  NEXT_PUBLIC_SITE_URL: z.url(),
  /** Web Push public key (VAPID). Public by design; optional. */
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().min(1).optional(),
  ),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function parsePublicEnv() {
  // Each variable must be referenced literally so Next.js can inline it.
  return publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  });
}

export function getPublicEnv(): PublicEnv {
  const result = parsePublicEnv();
  if (!result.success) {
    throw new Error(
      `Invalid public environment: ${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}
