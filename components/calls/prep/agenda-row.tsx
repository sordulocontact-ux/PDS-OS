"use client";

import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconPenWriting2,
  IconTrash,
  IconXmark,
} from "nucleo-sharp-essential";
import { useState, type ComponentProps, type ReactNode } from "react";

import { FieldError } from "@/components/auth/form-message";
import { IconGrip } from "@/components/icons";
import { MinutesInput } from "@/components/calls/minutes-input";
import { Input } from "@/components/ui/input";
import { callPrep } from "@/lib/i18n/fr/call-prep";
import { cn } from "@/lib/utils";

import type { AgendaDraftItem } from "./use-agenda-draft";

const fr = { callPrep };

const ICON_BUTTON =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-[color:var(--text-secondary)] hover:bg-[var(--surface-soft)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:outline-none";

function IconButton({
  label,
  children,
  className,
  ...props
}: ComponentProps<"button"> & { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label.split(" «")[0]}
      className={cn(ICON_BUTTON, className)}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * One point of the agenda: handle to drag (arrow keys too), « 1. Point »,
 * Monter / Descendre on touch screens only, Modifier in place (Enter saves,
 * Escape cancels), Retirer, and its duration in minutes.
 */
export function AgendaRow({
  item,
  index,
  count,
  rowProps,
  gripProps,
  dragging,
  overEdge,
  onMove,
  onEdit,
  onRemove,
  onMinutes,
}: {
  item: AgendaDraftItem;
  index: number;
  count: number;
  rowProps: ComponentProps<"li">;
  gripProps: ComponentProps<"button">;
  dragging: boolean;
  overEdge: "before" | "after" | null;
  onMove: (delta: -1 | 1) => void;
  onEdit: (topic: string) => void;
  onRemove: () => void;
  onMinutes: (minutes: number) => void;
}) {
  const t = fr.callPrep;
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const save = () => {
    const topic = (editing ?? "").trim();
    if (!topic) return setError(true);
    onEdit(topic);
    setEditing(null);
    setError(false);
  };

  if (editing !== null)
    return (
      <li className="flex flex-col gap-1 border-b border-[var(--border-hairline)] px-3 py-2 last:border-b-0">
        <span className="flex items-center gap-2">
          <span className="w-8 shrink-0 text-right tabular-nums">
            {index + 1}.
          </span>
          <Input
            autoFocus
            value={editing}
            maxLength={200}
            aria-label={t.pointLabel(index + 1)}
            aria-invalid={error || undefined}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => setEditing(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save();
              } else if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                setEditing(null);
                setError(false);
              }
            }}
            className="h-9 flex-1 text-body-md"
          />
          <IconButton label={t.save} onClick={save}>
            <IconCheck aria-hidden className="size-4" />
          </IconButton>
          <IconButton label={t.cancel} onClick={() => setEditing(null)}>
            <IconXmark aria-hidden className="size-4" />
          </IconButton>
        </span>
        {error && (
          <FieldError id={`agenda-edit-${item.id}-error`}>
            {t.pointMissing}
          </FieldError>
        )}
      </li>
    );

  return (
    <li
      {...rowProps}
      className={cn(
        "relative flex flex-col gap-1 border-b border-[var(--border-hairline)] px-3 py-2 last:border-b-0",
        dragging && "opacity-45",
        overEdge === "before" && "shadow-[inset_0_2px_0_var(--selection)]",
        overEdge === "after" && "shadow-[inset_0_-2px_0_var(--selection)]",
      )}
    >
      <span className="flex min-h-10 items-center gap-2">
        <IconButton
          {...gripProps}
          label={t.move(item.topic)}
          title={t.dragHint}
          className="cursor-grab touch-none active:cursor-grabbing"
        >
          <IconGrip aria-hidden className="size-4" />
        </IconButton>
        <span className="min-w-0 flex-1 text-body-md font-medium break-words">
          {index + 1}. {item.topic}
        </span>
        {item.minutes !== null && (
          <MinutesInput
            topic={item.topic}
            value={item.minutes}
            onChange={onMinutes}
          />
        )}
        <span className="flex shrink-0 items-center">
          {index > 0 && (
            <IconButton
              label={t.up(item.topic)}
              onClick={() => onMove(-1)}
              className="hidden pointer-coarse:inline-flex"
            >
              <IconChevronUp aria-hidden className="size-4" />
            </IconButton>
          )}
          {index < count - 1 && (
            <IconButton
              label={t.down(item.topic)}
              onClick={() => onMove(1)}
              className="hidden pointer-coarse:inline-flex"
            >
              <IconChevronDown aria-hidden className="size-4" />
            </IconButton>
          )}
          <IconButton
            label={t.edit(item.topic)}
            onClick={() => setEditing(item.topic)}
          >
            <IconPenWriting2 aria-hidden className="size-4" />
          </IconButton>
          <IconButton label={t.removePoint(item.topic)} onClick={onRemove}>
            <IconTrash aria-hidden className="size-4" />
          </IconButton>
        </span>
      </span>
    </li>
  );
}
