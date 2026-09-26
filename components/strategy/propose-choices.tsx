"use client";

import { useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { useCanEditProject } from "@/components/projects/edit-access";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import { proposeStrategyChoices } from "@/lib/strategy/actions/choices";

// "Proposer des réponses": PO pre-checks the three questions from the
// validated Brief and the call reports. Only for the owner, while editable.
export function ProposeChoices({ projectId }: { projectId: string }) {
  const t = fr.strategy.choices;
  const canEdit = useCanEditProject();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    kind: "info" | "error";
    text: string;
  } | null>(null);

  if (!canEdit) return null;

  function propose() {
    setMessage(null);
    startTransition(async () => {
      const result = await proposeStrategyChoices(projectId);
      if (result.ok) {
        setMessage({ kind: "info", text: t.proposedCount(result.count) });
      } else if (result.error === "no_sources") {
        setMessage({ kind: "info", text: t.noSources });
      } else if (result.error === "stage_locked") {
        setMessage({ kind: "error", text: fr.framing.errors.stage_locked });
      } else {
        setMessage({ kind: "error", text: t.failed });
      }
    });
  }

  return (
    <div className="grid gap-2 pt-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground sm:max-w-md">
          {t.proposeHint}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={propose}
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {pending ? t.proposing : t.propose}
        </Button>
      </div>
      {message && <FormMessage kind={message.kind}>{message.text}</FormMessage>}
    </div>
  );
}
