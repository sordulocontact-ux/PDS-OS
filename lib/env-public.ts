import { z } from "zod";

/**
 * Public environment variables — inlined into the browser bundle at build time.
 * Never put a secret here.
 */
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().trim().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function parsePublicEnv() {
  // Each variable must be referenced literally so Next.js can inline it.
  return publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
