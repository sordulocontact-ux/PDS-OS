import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fundings } from "@/lib/i18n/fr/fundings";
import { reconcile } from "@/lib/i18n/fr/reconcile";
import { treasury } from "@/lib/i18n/fr/treasury";
import { parseEurosToCents } from "@/lib/projects/schemas";

// What every write of Finance shares (lib/finance/*-actions.ts): the
// parsing of amounts, texts, ids and days, the words of SQL's refusals,
// the refresh of the section. The rules themselves stay in SQL.

const t = treasury.errors;

export const cents = (value: string) => {
  const parsed = parseEurosToCents(value);
  return parsed === null || parsed === undefined ? null : parsed;
};

export const positiveEuros = z.string().transform((value, ctx) => {
  const parsed = cents(value);
  if (parsed === null || parsed <= 0) {
    ctx.addIssue({ code: "custom" });
    return z.NEVER;
  }
  return parsed;
});

export const optionalText = (max: number) =>
  z
    .string()
    .optional()
    .transform((v) => v?.trim() || null)
    .pipe(z.string().max(max).nullable());

export const optionalId = z
  .string()
  .optional()
  .transform((v) => v || null)
  .pipe(z.uuid().nullable());

export const optionalDay = z
  .string()
  .optional()
  .transform((v) => v || null)
  .pipe(z.iso.date().nullable());

// SQL's refusals (P0001 messages, RLS) in the words of the page.
const REFUSALS: [string, string][] = [
  ["receipt_over_amount", t.overAmount],
  ["amount_below_received", t.belowReceived],
  ["income_has_receipts", t.hasReceipts],
  ["income_has_credits", t.hasCredits],
  ["income_cancelled", t.cancelled],
  ["credit_over_amount", t.creditOver],
  ["credit_without_invoice", t.creditWithoutInvoice],
  ["credit_before_invoice", t.creditBeforeInvoice],
  ["credit_over_limit", fundings.errors.overLimit],
  ["transaction_over_amount", reconcile.errors.overAmount],
  ["transaction_direction", reconcile.errors.direction],
  ["transaction_ignored", reconcile.errors.ignored],
  ["transaction_matched", reconcile.errors.matched],
];

export function failure(
  error: { code?: string; message: string },
  where: string,
) {
  const message = error.message;
  if (error.code === "42501" || message.includes("row-level security"))
    return { ok: false as const, error: t.forbidden };
  const known = REFUSALS.find(([code]) => message.includes(code));
  if (known) return { ok: false as const, error: known[1] };
  console.error(`${where}:`, message);
  return { ok: false as const, error: t.generic };
}

export function refresh() {
  revalidatePath(routes.finance, "layout");
}

export async function organization() {
  const access = await requireApproved();
  return access.organizationId;
}

/** A file the browser put in the bucket under the organization
 * (lib/finance/upload-file.ts): its path and name, or nothing. */
export const fileInput = (organizationId: string) =>
  z
    .object({
      path: z.string().max(300),
      name: z.string().trim().min(1).max(200),
    })
    .nullable()
    .optional()
    .refine((f) => !f || f.path.startsWith(`${organizationId}/`));
