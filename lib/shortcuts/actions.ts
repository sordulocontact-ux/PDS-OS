"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { shortcuts as t } from "@/lib/i18n/fr/shortcuts";
import {
  DEFAULT_SHORTCUTS,
  SHORTCUT_ACTIONS,
  type ShortcutMap,
  mergeShortcuts,
  shortcutOverrides,
  shortcutOwner,
  shortcutSchema,
} from "@/lib/shortcuts/definitions";
import { createClient } from "@/lib/supabase/server";

const inputSchema = z.object({
  action: z.enum(SHORTCUT_ACTIONS),
  // null: back to the default.
  shortcut: shortcutSchema.nullable(),
});

export type SaveShortcutResult =
  | { ok: true; shortcuts: ShortcutMap; done: string }
  | { ok: false; error: string };

/** Changes one of the reader's shortcuts, or puts its default back. Only
 * what differs from the defaults is kept (their own row, RLS). */
export async function saveShortcut(
  input: unknown,
): Promise<SaveShortcutResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t.errors.unsupported };
  const access = await requireApproved();
  if (!access.accountId) return { ok: false, error: t.errors.failed };
  const supabase = await createClient();

  const { data: row, error: readError } = await supabase
    .from("account_shortcuts")
    .select("shortcuts")
    .maybeSingle();
  if (readError) return { ok: false, error: t.errors.failed };

  const { action, shortcut } = parsed.data;
  const next = mergeShortcuts(row?.shortcuts);
  const chosen = shortcut ?? DEFAULT_SHORTCUTS[action];
  const owner = shortcutOwner(next, chosen, action);
  if (owner) {
    return { ok: false, error: t.errors.ownerOf(t.actions[owner]) };
  }
  next[action] = chosen;

  const { error } = await supabase.from("account_shortcuts").upsert({
    account_id: access.accountId,
    shortcuts: shortcutOverrides(next),
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: t.errors.failed };
  return { ok: true, shortcuts: next, done: shortcut ? t.saved : t.restored };
}
