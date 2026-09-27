"use client";

import { IconImage, type IconProps } from "nucleo-sharp-essential";
import { useId, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * A zone to drop files on, or to click (or focus and press Enter/Space) to
 * pick them: a native file input inside a label, so keyboard and screen
 * readers work as for any file field. The caller checks the files.
 */
export function FileDropZone({
  label,
  hint,
  accept,
  multiple = false,
  disabled = false,
  describedBy,
  icon: Icon = IconImage,
  onFiles,
}: {
  label: string;
  hint?: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  describedBy?: string;
  // What is expected (an image by default).
  icon?: React.ComponentType<IconProps>;
  onFiles: (files: File[]) => void;
}) {
  const id = useId();
  const [dragging, setDragging] = useState(false);

  const onDragOver = (event: React.DragEvent) => {
    if (disabled || !event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setDragging(true);
  };
  // Leaving for a child (icon, text) is not leaving the zone.
  const onDragLeave = (event: React.DragEvent) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null))
      setDragging(false);
  };
  const onDrop = (event: React.DragEvent) => {
    if (disabled) return;
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
    const files = [...event.dataTransfer.files];
    if (files.length > 0) onFiles(multiple ? files : files.slice(0, 1));
  };

  return (
    <label
      htmlFor={id}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      data-dragging={dragging || undefined}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-6 text-center transition-colors",
        "hover:bg-muted has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-[color:var(--focus-ring)]",
        "data-dragging:border-solid data-dragging:border-ring data-dragging:bg-muted",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <Icon aria-hidden className="size-6 text-muted-foreground" />
      <span className="text-sm font-medium">{label}</span>
      {hint && <span className="text-sm text-muted-foreground">{hint}</span>}
      <input
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        aria-describedby={describedBy}
        className="sr-only"
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          // Picking the same file again must fire a change.
          event.target.value = "";
          if (files.length > 0) onFiles(files);
        }}
      />
    </label>
  );
}
