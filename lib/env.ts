import "server-only";

import { z } from "zod";

import {
  DEFAULT_LLM_PROVIDER,
  DEFAULT_TRANSCRIPTION_PROVIDER,
  LLM_PROVIDERS,
  PROVIDER_API_KEY,
  TRANSCRIPTION_PROVIDERS,
} from "@/lib/ai/providers";
import { parsePublicEnv } from "@/lib/env-public";

export { getPublicEnv, type PublicEnv } from "@/lib/env-public";

/** An empty value in .env.local means "not set". */
const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalSecret = z.preprocess(
  blankToUndefined,
  z.string().trim().min(1).optional(),
);

/**
 * Server-only environment variables. Secrets live here and never reach the browser.
 * Only the key of the *selected* provider is required.
 */
export const serverEnvSchema = z
  .object({
    SUPABASE_SERVICE_ROLE_KEY: optionalSecret,
    LLM_PROVIDER: z.preprocess(
      blankToUndefined,
      z.enum(LLM_PROVIDERS).default(DEFAULT_LLM_PROVIDER),
    ),
    TRANSCRIPTION_PROVIDER: z.preprocess(
      blankToUndefined,
      z.enum(TRANSCRIPTION_PROVIDERS).default(DEFAULT_TRANSCRIPTION_PROVIDER),
    ),
    /** Optional override of the default model of the selected provider. */
    LLM_MODEL: optionalSecret,
    TRANSCRIPTION_MODEL: optionalSecret,
    MISTRAL_API_KEY: optionalSecret,
    GOOGLE_GENERATIVE_AI_API_KEY: optionalSecret,
    ANTHROPIC_API_KEY: optionalSecret,
    GROQ_API_KEY: optionalSecret,
    /** Shared secret of the Vercel cron (Authorization: Bearer <CRON_SECRET>). */
    CRON_SECRET: z.preprocess(blankToUndefined, z.string().min(32).optional()),
    /** Optional: Odesli closed its public API, keys come from a whitelist. */
    ODESLI_API_KEY: optionalSecret,
    /** Unsplash and Tumblr: optional, each turns its source on (similar references). */
    UNSPLASH_ACCESS_KEY: optionalSecret,
    TUMBLR_API_KEY: optionalSecret,
    /** Are.na: optional, a Premium token opens its search by words. */
    ARENA_TOKEN: optionalSecret,
    /** Openverse: optional, raise the free anonymous search limit. */
    OPENVERSE_CLIENT_ID: optionalSecret,
    OPENVERSE_CLIENT_SECRET: optionalSecret,
    /** Notion: optional, sent feedback stays in the app without them. */
    NOTION_TOKEN: optionalSecret,
    NOTION_FEEDBACK_DATABASE_ID: z.preprocess(
      blankToUndefined,
      z
        .string()
        .regex(
          /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i,
        )
        .optional(),
    ),
    /** Google Calendar: optional, a new call takes a pasted link without them. */
    GOOGLE_CALENDAR_CLIENT_ID: optionalSecret,
    GOOGLE_CALENDAR_CLIENT_SECRET: optionalSecret,
    GOOGLE_CALENDAR_REFRESH_TOKEN: optionalSecret,
    GOOGLE_CALENDAR_ID: optionalSecret,
    /** Web Push: optional, browser notifications are off without them. */
    VAPID_PRIVATE_KEY: optionalSecret,
    /** Same value as the Vault secret push_claim_secret: pushes are off without it. */
    PUSH_CLAIM_SECRET: z.preprocess(
      blankToUndefined,
      z.string().min(32).optional(),
    ),
    VAPID_SUBJECT: z.preprocess(
      blankToUndefined,
      z
        .string()
        .regex(/^(mailto:|https:\/\/)/)
        .optional(),
    ),
  })
  .superRefine((env, ctx) => {
    for (const provider of [env.LLM_PROVIDER, env.TRANSCRIPTION_PROVIDER]) {
      const keyName = PROVIDER_API_KEY[provider];
      if (!env[keyName]) {
        ctx.addIssue({
          code: "custom",
          path: [keyName],
          message: `Required by the selected provider "${provider}".`,
        });
      }
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getServerEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(
      `Invalid server environment: ${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}

export type EnvIssue = { variable: string; reason: "missing" | "invalid" };
export type EnvStatus = { valid: boolean; issues: EnvIssue[] };

/**
 * Checks public and server variables together. Reports variable names only,
 * never their values, so the result is safe to display or log.
 */
export function checkEnv(): EnvStatus {
  const issues = [parsePublicEnv(), serverEnvSchema.safeParse(process.env)]
    .flatMap((result) => (result.success ? [] : result.error.issues))
    .map((issue): EnvIssue => {
      const variable = issue.path.join(".");
      const isBlank = blankToUndefined(process.env[variable]) === undefined;
      return { variable, reason: isBlank ? "missing" : "invalid" };
    });

  return { valid: issues.length === 0, issues };
}
