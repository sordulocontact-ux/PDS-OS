"use client";

import { useShortcuts } from "@/components/shell/shortcuts/shortcuts-provider";
import { Kbd } from "@/components/ui/kbd";
import { shortcuts as shortcutsText } from "@/lib/i18n/fr/shortcuts";
import type { Shortcut, ShortcutAction } from "@/lib/shortcuts/definitions";
import { cn } from "@/lib/utils";

const fr = { shortcuts: shortcutsText };

/** The keys to press, as written on screen: « ⌘K », « N », or « Espace »
 * twice. */
export function shortcutParts(shortcut: Shortcut): string[] {
  const t = fr.shortcuts.keys;
  const key = shortcut.key === " " ? t.space : shortcut.key.toUpperCase();
  const one = shortcut.mod ? `${t.mod}${key}` : key;
  return shortcut.double ? [one, one] : [one];
}

/** The same in one string, inside a sentence or a label. */
export function shortcutText(shortcut: Shortcut): string {
  return shortcutParts(shortcut).join(" ");
}

/**
 * The reader's shortcut for an action, in keys (`Kbd`): the search's ⌘K,
 * the « + »'s N, PO's Espace Espace. `raised` = a key to press now.
 */
export function ShortcutKeys({
  action,
  shortcut,
  raised = false,
  className,
}: {
  action?: ShortcutAction;
  // A shortcut not saved yet (the settings page).
  shortcut?: Shortcut;
  raised?: boolean;
  className?: string;
}) {
  const saved = useShortcuts().shortcuts;
  const shown = shortcut ?? (action ? saved[action] : null);
  if (!shown) return null;
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {shortcutParts(shown).map((part, index) => (
        <Kbd key={index} raised={raised}>
          {part}
        </Kbd>
      ))}
    </span>
  );
}
