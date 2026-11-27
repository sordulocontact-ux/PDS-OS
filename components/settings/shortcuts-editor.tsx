"use client";

import { useState } from "react";

import { ShortcutRow } from "@/components/settings/shortcut-row";
import { useShortcuts } from "@/components/shell/shortcuts/shortcuts-provider";
import { Rows } from "@/components/ui/rows";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { shortcuts as shortcutsText } from "@/lib/i18n/fr/shortcuts";
import { saveShortcut } from "@/lib/shortcuts/actions";
import {
  DEFAULT_SHORTCUTS,
  SHORTCUT_ACTIONS,
  sameShortcut,
  type Shortcut,
  type ShortcutAction,
} from "@/lib/shortcuts/definitions";

const fr = { shortcuts: shortcutsText };

/**
 * Paramètres › Raccourcis clavier: each shortcut of the reader, « Modifier »
 * listens for the new key (checked here, then by the server), « Rétablir »
 * puts the default back. Saved at once, taken by the whole app at once.
 */
export function ShortcutsEditor() {
  const { shortcuts, setShortcuts } = useShortcuts();
  const [editing, setEditing] = useState<ShortcutAction | null>(null);
  const { pending, error, setError, run } = useWriteSubmit(
    () => setEditing(null),
    fr.shortcuts.saved,
  );

  function save(action: ShortcutAction, shortcut: Shortcut | null) {
    run(async () => {
      const result = await saveShortcut({ action, shortcut });
      if (result.ok) setShortcuts(result.shortcuts);
      return result;
    });
  }

  return (
    <Rows>
      {SHORTCUT_ACTIONS.map((action) => (
        <ShortcutRow
          key={action}
          action={action}
          shortcut={shortcuts[action]}
          shortcuts={shortcuts}
          changed={!sameShortcut(shortcuts[action], DEFAULT_SHORTCUTS[action])}
          editing={editing === action}
          pending={pending}
          serverError={editing === action ? error : null}
          onEdit={() => {
            setError(null);
            setEditing(action);
          }}
          onCancel={() => setEditing(null)}
          onSave={(shortcut) => save(action, shortcut)}
          onReset={() => save(action, null)}
        />
      ))}
    </Rows>
  );
}
