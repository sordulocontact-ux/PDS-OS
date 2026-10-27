"use client";

import { useState } from "react";

import { FieldError } from "@/components/auth/form-message";
import { BriefDetailedRequest } from "@/components/framing/brief/brief-detailed-request";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { DecisionPanel } from "@/components/ui/decision-panel";
import { ToneCallout } from "@/components/ui/tone-callout";
import { decideFramingBrief } from "@/lib/framing/actions/brief-step";
import { DIMENSIONS } from "@/lib/framing/dimensions";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";
import { framingJourney } from "@/lib/i18n/fr/framing-journey";

const fr = { framingIntel, framingJourney };

/**
 * The direction's decision on the Brief, in the step (proto frBrief):
 * « Le projet est-il assez clair pour que PO organise la suite ? », the
 * dimensions to review, a comment (required to ask for a change), then
 * « Valider le Brief » or « Demander une modification ». Only the
 * dimensions checked reopen.
 */
export function BriefDirectionDecision({
  projectId,
  validationId,
  openMandatory,
}: {
  projectId: string;
  validationId: string;
  // Mandatory requests still open (PROJ-UX-06): validating is refused.
  openMandatory: number;
}) {
  const t = fr.framingJourney.brief;
  const [dims, setDims] = useState<string[]>([]);
  const [tried, setTried] = useState(false);
  const lacking = tried && dims.length === 0;
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-[color:var(--border-hairline)] p-4">
      {openMandatory > 0 && (
        <ToneCallout tone="warning">
          {t.openRequests(openMandatory)}
        </ToneCallout>
      )}
      <DecisionPanel
        id="framing-brief"
        title={t.question}
        commentLabel={t.comment}
        commentHint={t.commentHint}
        commentRequired={t.commentRequired}
        fields={
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-body-md font-semibold">
              {t.toReview}
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {DIMENSIONS.map((d, index) => (
                <CheckboxField
                  key={d}
                  label={`${fr.framingIntel.dimensionNumber(index)} · ${fr.framingIntel.dimensions[d]}`}
                  checked={dims.includes(d)}
                  onChange={(on) =>
                    setDims((all) =>
                      on ? [...all, d] : all.filter((x) => x !== d),
                    )
                  }
                />
              ))}
            </div>
            <FieldError id="framing-brief-dims-error">
              {lacking ? t.dimsRequired : undefined}
            </FieldError>
          </fieldset>
        }
        check={(kind) => {
          if (kind === "approve") return true;
          setTried(true);
          return dims.length > 0;
        }}
        outcomes={[
          {
            kind: "approve",
            label: t.approve,
            done: fr.framingJourney.done.briefValidated,
          },
          {
            kind: "request_changes",
            label: t.requestChange,
            done: fr.framingJourney.done.changesRequested,
          },
        ]}
        onDecide={(kind, comment) =>
          decideFramingBrief(
            projectId,
            validationId,
            kind === "approve",
            comment,
            kind === "approve" ? [] : dims,
          )
        }
      />
      <BriefDetailedRequest projectId={projectId} validationId={validationId} />
    </section>
  );
}
