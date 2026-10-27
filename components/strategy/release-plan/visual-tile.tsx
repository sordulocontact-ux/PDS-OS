"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { strategyReleasePlan } from "@/lib/i18n/fr/strategy-release-plan";
import { cn } from "@/lib/utils";

const fr = { strategyReleasePlan };

/** One image the owner may allow in the document: a thumbnail and a box. */
export function VisualTile({
  name,
  url,
  selected,
  disabled,
  onToggle,
}: {
  name: string;
  url: string;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer flex-col gap-2 rounded-2xl border p-2 transition-[border-color,background-color] duration-[var(--duration-fast)]",
        selected
          ? "border-[var(--selection-border)] bg-[var(--selection-bg)]"
          : "border-border hover:bg-[var(--control-bg-hover)]",
        disabled && "cursor-default",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- signed URL, public bucket or reference */}
      <img
        src={url}
        alt=""
        loading="lazy"
        className="aspect-square w-full rounded-xl bg-muted object-cover"
      />
      <span className="flex min-w-0 items-center gap-2 text-caption">
        <Checkbox
          checked={selected}
          disabled={disabled}
          aria-label={fr.strategyReleasePlan.visuals.select(name)}
          onChange={onToggle}
        />
        <span className="truncate">{name}</span>
      </span>
    </label>
  );
}
