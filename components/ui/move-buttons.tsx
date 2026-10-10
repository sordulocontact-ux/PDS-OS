"use client";

import { IconArrowDown, IconArrowUp } from "@/components/icons";
import { Button } from "@/components/ui/button";

/**
 * « Monter » / « Descendre » of an item in an ordered list (credits, phases,
 * formats, pages). Each button is named after the item for screen readers.
 */
export function MoveButtons({
  upLabel,
  downLabel,
  first,
  last,
  onMove,
  size = "icon-sm",
}: {
  upLabel: string;
  downLabel: string;
  first: boolean;
  last: boolean;
  onMove: (delta: -1 | 1) => void;
  size?: "icon" | "icon-sm";
}) {
  return (
    <span className="flex">
      <Button
        type="button"
        variant="ghost"
        size={size}
        disabled={first}
        onClick={() => onMove(-1)}
        aria-label={upLabel}
      >
        <IconArrowUp aria-hidden />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size={size}
        disabled={last}
        onClick={() => onMove(1)}
        aria-label={downLabel}
      >
        <IconArrowDown aria-hidden />
      </Button>
    </span>
  );
}
