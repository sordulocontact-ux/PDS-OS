"use client";

import { toast } from "sonner";

import { IconCopy } from "@/components/icons";
import { Button } from "@/components/ui/button";

/**
 * Copies a text (a link) to the clipboard, said by a toast. `value` may be
 * read at click time (the page's own address). When the browser refuses,
 * `failedLabel` says so (the link stays readable next to it), or nothing.
 * `icon` is an element, not a component: a server component can pass it.
 */
export function CopyButton({
  value,
  label,
  copiedLabel,
  failedLabel,
  icon = <IconCopy aria-hidden />,
  variant = "outline",
  size = "lg",
  className,
}: {
  value: string | (() => string);
  label: string;
  copiedLabel: string;
  failedLabel?: string;
  icon?: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(
            typeof value === "function" ? value() : value,
          );
          toast.success(copiedLabel);
        } catch {
          if (failedLabel) toast.error(failedLabel);
        }
      }}
    >
      {icon}
      {label}
    </Button>
  );
}
