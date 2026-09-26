"use client";

import { RefreshCwIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import type { CheckReleaseResult } from "@/lib/release/action-types";

const t = fr.release.detection;

/** Runs a detection now. Takes a few seconds: the label says so. */
export function CheckButton({
  action,
  disabled,
}: {
  action: () => Promise<CheckReleaseResult>;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      try {
        const result = await action();
        if (result.ok) toast.success(t.checked(result.linkCount));
        else toast.error(t.errors[result.error] ?? t.errors.generic);
      } catch {
        toast.error(t.errors.generic);
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={onClick}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
    >
      <RefreshCwIcon
        data-icon="inline-start"
        className={
          pending ? "animate-spin motion-reduce:animate-none" : undefined
        }
        aria-hidden
      />
      {pending ? t.checking : t.check}
    </Button>
  );
}
