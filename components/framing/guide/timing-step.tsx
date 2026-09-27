"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  OptionContent,
  optionClass,
} from "@/components/framing/guide/guide-row";
import { SourceDetail } from "@/components/framing/guide/source-quote";
import { FramingStepCard } from "@/components/framing/guide/step-card";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { confirmField, saveField } from "@/lib/framing/actions/brief";
import type { BriefFieldState } from "@/lib/framing/brief";
import { fr } from "@/lib/i18n/fr";

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

  return (
    <FramingStepCard
      title={t.title}
      actions={
        editable &&
        (editing ? (
          <>
            {field.value && (
              <Button
                size="lg"
                variant="ghost"
                disabled={pending}
                onClick={() => setEditing(false)}
              >
                {fr.framingGuide.cancel}
              </Button>
            )}
            <Button
              size="lg"
              type="submit"
              form="timing-form"
              disabled={pending || draft.trim() === ""}
            >
              {fr.framingGuide.save}
            </Button>
          </>
        ) : (
          <>
            <Button
              size="lg"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                setDraft(field.value ?? "");
                setEditing(true);
              }}
            >
              {t.edit}
            </Button>
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
          </>
        ))
      }
    >
      {editable && editing ? (
        <form
          id="timing-form"
          onSubmit={(event) => {
            event.preventDefault();
            run(() => saveField(projectId, "brief", "timing", draft), next);
          }}
        >
          <Input
            aria-label={t.label}
            value={draft}
            placeholder={t.placeholder}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
        </form>
      ) : (
        field.value && (
          <div className={optionClass(true)}>
            <OptionContent
              detail={
                <SourceDetail
                  provenance={field.provenance}
                  proposed={proposed}
                />
              }
            >
              {field.value}
            </OptionContent>
          </div>
        )
      )}
    </FramingStepCard>
  );
}
