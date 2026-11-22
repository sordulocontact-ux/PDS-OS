"use client";

import type { ComponentType } from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * A secondary gesture as its icon alone, its words in a tooltip shown fast
 * and to screen readers (Sacha 15/11/2026 for a list's tools, 22/11/2026 for
 * a card's: « le bouton principal en texte, les autres en icône »). The
 * main gesture beside it keeps its words.
 */
export function IconAction({
  label,
  icon: Icon,
  onClick,
  variant = "outline",
  size = "icon",
  disabled = false,
  busy = false,
}: {
  label: string;
  icon: ComponentType<{ "aria-hidden"?: boolean; className?: string }>;
  onClick: () => void;
  variant?: "default" | "outline" | "ghost";
  // `icon-sm` beside the small buttons of a card's head.
  size?: "icon" | "icon-sm";
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant={variant}
            size={size}
            aria-label={label}
            disabled={disabled}
            aria-busy={busy || undefined}
            className="relative z-10"
            onClick={onClick}
          />
        }
      >
        <Icon aria-hidden />
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
