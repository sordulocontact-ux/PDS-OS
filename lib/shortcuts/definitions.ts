import { z } from "zod";

/**
 * The app's keyboard shortcuts each member may change (Réglages › Raccourcis
 * clavier, 27/11/2026). Client-safe: read by the listeners, the hints on
 * screen and the settings page. A shortcut is one key alone, the same key
 * with ⌘ (Ctrl off a Mac), or Space pressed twice.
 */
export const SHORTCUT_ACTIONS = [
  "search",
  "create",
  "assistant",
  "capture",
] as const;

export type ShortcutAction = (typeof SHORTCUT_ACTIONS)[number];

export type Shortcut = {
  // One lowercase letter or digit, or " " (Space).
  key: string;
  // ⌘ on a Mac, Ctrl elsewhere.
  mod: boolean;
  // Pressed twice within DOUBLE_PRESS_MS (Space only: once, it scrolls).
  double: boolean;
};

export type ShortcutMap = Record<ShortcutAction, Shortcut>;

export const DEFAULT_SHORTCUTS: ShortcutMap = {
  search: { key: "k", mod: true, double: false },
  create: { key: "n", mod: false, double: false },
  assistant: { key: " ", mod: false, double: true },
  // As Figma's comment tool.
  capture: { key: "c", mod: false, double: false },
};

/** Two presses of a doubled key within this delay count as one shortcut. */
export const DOUBLE_PRESS_MS = 350;

const LETTER_OR_DIGIT = /^[a-z0-9]$/;

// With ⌘ / Ctrl, the browser or the system already answers these (select
// all, copy, find, new tab, print, a tab's number…): never offered.
const TAKEN_WITH_MOD = new Set("acdfghjlmnopqrstuvwxyz0123456789".split(""));

export type ShortcutProblem = "unsupported" | "taken";

/** Why a shortcut cannot be used, or null. */
export function shortcutProblem(shortcut: Shortcut): ShortcutProblem | null {
  if (shortcut.key === " ") {
    return shortcut.double && !shortcut.mod ? null : "unsupported";
  }
  if (!LETTER_OR_DIGIT.test(shortcut.key) || shortcut.double)
    return "unsupported";
  if (shortcut.mod && TAKEN_WITH_MOD.has(shortcut.key)) return "taken";
  return null;
}

export const shortcutSchema = z
  .object({ key: z.string().max(1), mod: z.boolean(), double: z.boolean() })
  .refine((value) => shortcutProblem(value) === null);

export function sameShortcut(a: Shortcut, b: Shortcut): boolean {
  return a.key === b.key && a.mod === b.mod && a.double === b.double;
}

/** The other action already on this shortcut, if any. */
export function shortcutOwner(
  shortcuts: ShortcutMap,
  shortcut: Shortcut,
  except: ShortcutAction,
): ShortcutAction | null {
  return (
    SHORTCUT_ACTIONS.find(
      (action) =>
        action !== except && sameShortcut(shortcuts[action], shortcut),
    ) ?? null
  );
}

/** The stored overrides on top of the defaults; a bad or clashing entry
 * falls back to its default. */
export function mergeShortcuts(stored: unknown): ShortcutMap {
  const merged: ShortcutMap = { ...DEFAULT_SHORTCUTS };
  if (!stored || typeof stored !== "object") return merged;
  const entries = stored as Partial<Record<string, unknown>>;
  for (const action of SHORTCUT_ACTIONS) {
    const parsed = shortcutSchema.safeParse(entries[action]);
    if (!parsed.success) continue;
    if (shortcutOwner(merged, parsed.data, action)) continue;
    merged[action] = parsed.data;
  }
  return merged;
}

/** Only what differs from the defaults: what is kept in the base. */
export function shortcutOverrides(
  shortcuts: ShortcutMap,
): Partial<ShortcutMap> {
  const overrides: Partial<ShortcutMap> = {};
  for (const action of SHORTCUT_ACTIONS) {
    if (!sameShortcut(shortcuts[action], DEFAULT_SHORTCUTS[action]))
      overrides[action] = shortcuts[action];
  }
  return overrides;
}

/** The shortcut a key press means, for the settings page: null for a key
 * that cannot be one (Échap, Tab, an arrow, ⌥ or Maj). */
export function shortcutFromEvent(event: KeyboardEvent): Shortcut | null {
  if (event.altKey || event.shiftKey) return null;
  const mod = event.metaKey || event.ctrlKey;
  if (event.key === " ") return { key: " ", mod, double: true };
  const key = event.key.toLowerCase();
  return key.length === 1 ? { key, mod, double: false } : null;
}

/** Whether a key press is the shortcut's key (one press of a doubled one). */
export function pressMatches(event: KeyboardEvent, shortcut: Shortcut) {
  const mod = event.metaKey || event.ctrlKey;
  return (
    event.key?.toLowerCase() === shortcut.key &&
    mod === shortcut.mod &&
    !event.altKey &&
    !event.shiftKey
  );
}
