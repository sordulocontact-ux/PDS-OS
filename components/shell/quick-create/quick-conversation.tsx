"use client";

import { useEffect } from "react";

import { useAssistant } from "@/components/assistant/assistant-provider";

/** « Nouvelle conversation »: PO's window of Espace Espace, typed (a click
 * is not a request to speak), its field focused. Nothing of its own: the
 * window is the assistant's. */
export function QuickConversation({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { openLauncher } = useAssistant();
  useEffect(() => {
    if (!open) return;
    openLauncher({ voice: false });
    onClose();
  }, [open, openLauncher, onClose]);
  return null;
}
