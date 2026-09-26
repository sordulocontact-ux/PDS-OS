"use client";

import { IconCopy } from "@/components/icons";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";

// Copies a sign-up link, with the same feedback as the smartlink.
export function CopyLinkButton({
  url,
  label,
  size = "lg",
}: {
  url: string;
  label: string;
  size?: "sm" | "lg";
}) {
  const t = fr.auth.newMember;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t.copied);
    } catch {
      toast.error(t.copyFailed);
    }
  }

  return (
    <Button type="button" variant="outline" size={size} onClick={copy}>
      <IconCopy data-icon="inline-start" aria-hidden />
      {label}
    </Button>
  );
}
