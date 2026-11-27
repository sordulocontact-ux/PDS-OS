"use client";

import { useKeyShortcut } from "@/components/shell/shortcuts/use-key-shortcut";

/**
 * C by default (as Figma's comment tool; Paramètres › Raccourcis clavier),
 * from any page, outside a field and with no window open: starts a zone
 * capture for a feedback.
 */
export function useCaptureShortcut(enabled: boolean, onStart: () => void) {
  useKeyShortcut("capture", onStart, { enabled });
}
