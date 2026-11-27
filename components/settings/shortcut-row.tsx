"use client";

import { useEffect, useId, useState } from "react";

import { FieldError } from "@/components/auth/form-message";
import {
  ShortcutKeys,
  shortcutText,
} from "@/components/shell/shortcuts/shortcut-keys";
import { Button } from "@/components/ui/button";
import { shortcuts as shortcutsText } from "@/lib/i18n/fr/shortcuts";
import {
  shortcutFromEvent,
  shortcutOwner,
  shortcutProblem,
  type Shortcut,
  type ShortcutAction,
  type ShortcutMap,
} from "@/lib/shortcuts/definitions";

const fr = { shortcuts: shortcutsText };

// Pressed alone, these wait for the key that goes with them.
const MODIFIERS = new Set(["Meta", "Control", "Alt", "Shift"]);

/** Why a pressed shortcut is refused, in words, or null. */
function refusal(
  shortcut: Shortcut | null,
  action: ShortcutAction,
  shortcuts: ShortcutMap,
): string | null {
  const t = fr.shortcuts.errors;
  if (!shortcut) return t.unsupported;
  const problem = shortcutProblem(shortcut);
  if (problem === "taken") return t.taken(shortcutText(shortcut));
  if (problem) return t.unsupported;
  const owner = shortcutOwner(shortcuts, shortcut, action);
  return owner
    ? t.owner(shortcutText(shortcut), fr.shortcuts.actions[owner])
    : null;
}

/**
 * One shortcut of Réglages: its action, its keys, « Modifier » (then the
 * page listens for the new key, Échap cancels) and « Rétablir » once it
 * differs from the default.
 */
export function ShortcutRow({
  action,
  shortcut,
  shortcuts,
  changed,
  editing,
  pending,
  serverError,
  onEdit,
  onCancel,
  onSave,
  onReset,
}: {
  action: ShortcutAction;
  shortcut: Shortcut;
  shortcuts: ShortcutMap;
  changed: boolean;
  editing: boolean;
  pending: boolean;
  serverError: string | null;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (shortcut: Shortcut) => void;
  onReset: () => void;
}) {
  const t = fr.shortcuts;
  const label = t.actions[action];
  const errorId = useId();
  const [refused, setRefused] = useState<string | null>(null);

  // While listening, every key is the new shortcut's: taken before any of
  // the app's listeners (window, capture), so none of them answers.
  useEffect(() => {
    if (!editing || pending) return;
    const onKey = (event: KeyboardEvent) => {
      if (MODIFIERS.has(event.key) || event.repeat) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.key === "Escape") return onCancel();
      const pressed = shortcutFromEvent(event);
      const why = refusal(pressed, action, shortcuts);
      setRefused(why);
      if (!why && pressed) onSave(pressed);
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKey, { capture: true });
  }, [editing, pending, action, shortcuts, onCancel, onSave]);

  const error = editing ? (refused ?? serverError) : null;

  return (
    <li className="grid gap-1.5 px-5 py-3">
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="text-body-md font-medium">{label}</span>
        {editing ? (
          <span className="flex items-center gap-3">
            <span
              role="status"
              className="text-body-sm text-[color:var(--text-secondary)]"
            >
              {t.listening}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRefused(null);
                onCancel();
              }}
            >
              {t.cancel}
            </Button>
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <ShortcutKeys shortcut={shortcut} className="mr-2" />
            {changed && (
              <Button
                variant="ghost"
                size="sm"
                aria-label={t.resetOf(label)}
                disabled={pending}
                onClick={onReset}
              >
                {t.reset}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              aria-label={t.changeOf(label)}
              onClick={() => {
                setRefused(null);
                onEdit();
              }}
            >
              {t.change}
            </Button>
          </span>
        )}
      </div>
      {editing && (
        <p
          className="text-caption text-[color:var(--text-secondary)]"
          aria-describedby={error ? errorId : undefined}
        >
          {t.listeningHint}
        </p>
      )}
      <FieldError id={errorId}>{error ?? undefined}</FieldError>
    </li>
  );
}
