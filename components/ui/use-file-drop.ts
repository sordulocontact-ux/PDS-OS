"use client";

import { useState } from "react";

/**
 * Drag and drop of files on an element: `dragging` while files hover it,
 * and the handlers to spread on it. Only real files count (not text or a
 * link dragged from the page). The caller checks the files.
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
    if (files.length > 0) onFiles(multiple ? files : files.slice(0, 1));
  };

  return { dragging, handlers: { onDragOver, onDragLeave, onDrop } };
}
