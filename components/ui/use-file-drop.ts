"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { registerPasteTarget } from "@/components/ui/paste-targets";

/**
 * Drag and drop of files on an element: `dragging` while files hover it,
 * and the handlers to spread on it (with the `ref` that also makes it take
 * files pasted with ⌘V / Ctrl+V, `paste-targets.ts`). Only real files count
 * (not text or a link dragged from the page). The caller checks the files.
 */
export function useFileDrop({
  disabled = false,
  multiple = false,
  onFiles,
}: {
  disabled?: boolean;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
}) {
  const [dragging, setDragging] = useState(false);
  // Read by the paste listener, which outlives a render.
  const latest = useRef({ disabled, multiple, onFiles });
  useEffect(() => {
    latest.current = { disabled, multiple, onFiles };
  });

  const receive = (files: File[]) => {
    const { multiple, onFiles } = latest.current;
    onFiles(multiple ? files : files.slice(0, 1));
  };

  const ref = useCallback(
    (element: HTMLElement | null) =>
      element
        ? registerPasteTarget(element, {
            enabled: () => !latest.current.disabled,
            receive,
          })
        : undefined,
    // `receive` only reads `latest`.
    [],
  );

  const onDragOver = (event: React.DragEvent) => {
    if (disabled || !event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setDragging(true);
  };
  // Leaving for a child (icon, text, row) is not leaving the element.
  const onDragLeave = (event: React.DragEvent) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null))
      setDragging(false);
  };
  const onDrop = (event: React.DragEvent) => {
    if (disabled || !event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
    const files = [...event.dataTransfer.files];
    if (files.length > 0) receive(files);
  };

  return { dragging, handlers: { ref, onDragOver, onDragLeave, onDrop } };
}
