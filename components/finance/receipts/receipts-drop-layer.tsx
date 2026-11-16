"use client";

import { IconPaperclip } from "nucleo-sharp-essential";
import { useEffect, useRef, useState } from "react";

import { financeReceipts } from "@/lib/i18n/fr/finance-receipts";

const t = financeReceipts;

const hasFiles = (event: DragEvent) =>
  Boolean(event.dataTransfer?.types.includes("Files"));

/**
 * Drop files anywhere on the page (Midday, docs/ANALYSE-MIDDAY.md § 3.5):
 * while files hover the window, a veil says where they go; dropped, they
 * are handed to `onFiles`. Real files only (not a text or a link dragged
 * from the page). Off while `disabled` (who only reads Finance).
 */
export function ReceiptsDropLayer({
  disabled,
  onFiles,
}: {
  disabled: boolean;
  onFiles: (files: File[]) => void;
}) {
  const [dragging, setDragging] = useState(false);
  // Entering a child fires before leaving its parent: count the levels.
  const depth = useRef(0);
  const latest = useRef(onFiles);
  useEffect(() => {
    latest.current = onFiles;
  });

  useEffect(() => {
    if (disabled) return;
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth.current += 1;
      setDragging(true);
    };
    const over = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDragging(false);
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current = 0;
      setDragging(false);
      const files = [...(e.dataTransfer?.files ?? [])];
      if (files.length > 0) latest.current(files);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, [disabled]);

  if (!dragging) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-3 z-50 grid place-items-center rounded-[var(--radius-xl)] border-2 border-dashed border-[color:var(--text-primary)] bg-[color-mix(in_srgb,var(--surface-page)_85%,transparent)]"
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <IconPaperclip aria-hidden className="size-6" />
        <p className="font-medium">{t.dropHere}</p>
        <p className="text-caption text-[color:var(--text-secondary)]">
          {t.dropHint}
        </p>
      </div>
    </div>
  );
}
