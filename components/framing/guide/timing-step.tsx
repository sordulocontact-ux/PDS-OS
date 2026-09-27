"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { sourceLabel } from "@/components/framing/guide/source-quote";
import { FramingStepCard } from "@/components/framing/guide/step-card";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToneCallout } from "@/components/ui/tone-callout";
import { confirmField, saveField } from "@/lib/framing/actions/brief";
import type { BriefFieldState } from "@/lib/framing/brief";
import { fr } from "@/lib/i18n/fr";
import { reviewTone } from "@/lib/ui/state-tones";

/**
 * The timing as it was said ("sortie visée le 24 octobre"): kept in words,
 * never turned into a date by PO. Confirmed, or rewritten by the owner.
 */
export function TimingStep({
  field,
  projectId,
  editable,
  nextHref,
}: {
  field: BriefFieldState;
  projectId: string;
  editable: boolean;
  nextHref: string;
}) {
  const t = fr.framingGuide.timing;
  const router = useRouter();
  const { pending, run } = useFramingAction();
  const [editing, setEditing] = useState(!field.value);
  const [draft, setDraft] = useState(field.value ?? "");
  const next = () => router.push(nextHref);
  const proposed = field.status === "proposed";
  const quote = field.provenance?.quote;

  return (
    <FramingStepCard
      eyebrow={proposed ? t.eyebrowProposed : t.eyebrow}
      title={field.value ?? t.titleEmpty}
      description={t.body}
      actions={
        editable &&
        (editing ? (
          <>
            <Button
              size="lg"
              type="submit"
              form="timing-form"
              disabled={pending || draft.trim() === ""}
            >
              {fr.framingGuide.save}
            </Button>
            {field.value && (
              <Button
                size="lg"
                variant="outline"
                disabled={pending}
                onClick={() => setEditing(false)}
              >
                {fr.framingGuide.cancel}
              </Button>
            )}
          </>
        ) : (
          <>
            <Button
              size="lg"
              disabled={pending}
              onClick={() =>
                proposed
                  ? run(() => confirmField(projectId, "brief", "timing"), next)
                  : next()
              }
            >
              {proposed ? t.confirm : fr.framingGuide.next}
            </Button>
            <Button
              size="lg"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setDraft(field.value ?? "");
                setEditing(true);
              }}
            >
              {t.edit}
            </Button>
          </>
        ))
      }
    >
      {proposed && field.provenance && (
        <ToneCallout tone={reviewTone.proposed}>
          {t.hypothesis(sourceLabel(field.provenance))}
          {quote ? ` « ${quote} »` : ""}
        </ToneCallout>
      )}

      {editable && editing && (
        <form
          id="timing-form"
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            run(() => saveField(projectId, "brief", "timing", draft), next);
          }}
        >
          <Label htmlFor="timing-value">{t.label}</Label>
          <Input
            id="timing-value"
            value={draft}
            placeholder={t.placeholder}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
        </form>
      )}
    </FramingStepCard>
  );
}
