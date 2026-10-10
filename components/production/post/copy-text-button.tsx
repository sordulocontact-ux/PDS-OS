"use client";

import { toast } from "sonner";

import { IconCopy } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";

/** Copies a text written by the code (the corrections to transmit). */
export function CopyTextButton({
  text,
  label,
  copied,
}: {
  text: string;
  label: string;
  copied: string;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          toast.success(copied);
        } catch {
          toast.error(fr.productionPost.errors.generic);
        }
      }}
    >
      <IconCopy aria-hidden data-icon="inline-start" />
      {label}
    </Button>
  );
}
