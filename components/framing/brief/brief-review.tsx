"use client";

import { useState } from "react";

import { FieldError, FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { BriefDetailedRequest } from "@/components/framing/brief/brief-detailed-request";
import { BriefChanges } from "@/components/framing/brief/brief-changes";
import { BriefVersionDoc } from "@/components/framing/brief/brief-version-doc";
import { Button } from "@/components/ui/button";
import { SunkCard } from "@/components/ui/sunk-card";
import { ToneCallout } from "@/components/ui/tone-callout";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { decideFramingBrief } from "@/lib/framing/actions/brief-step";
import type { BriefSnapshot } from "@/lib/framing/brief-snapshot";
import type { Dimension } from "@/lib/framing/dimensions";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";
import { framingJourney } from "@/lib/i18n/fr/framing-journey";
import type { Tone } from "@/lib/ui/state-tones";

const fr = { framingIntel, framingJourney };

/**
 * The direction reads the Brief sent and decides under it (proto « Suite du
 * Cadrage », Sacha 29/10/2026): « Le projet est-il assez clair pour que PO
 * organise la suite ? », « Valider le Brief » or « Demander une
 * modification ». Asking for a change marks the dimensions to review in the
 * document itself (they alone reopen) and asks what must change; the
 * detailed corrections (PROJ-UX-06) stay folded under it.
 */
export function BriefReview({
  projectId,
  validationId,
  openMandatory,
  snapshot,
  card,
}: {
  projectId: string;
  validationId: string;
  // Mandatory requests still open (PROJ-UX-06): validating is refused.
  openMandatory: number;
  snapshot: BriefSnapshot;
  card: {
    title: string;
    meta: string;
    status: { tone: Tone; label: string };
    actions?: React.ReactNode;
    changes?: string | null;
  };
}) {
  const t = fr.framingJourney.brief;
  const [asking, setAsking] = useState(false);
  const [marked, setMarked] = useState<Dimension[]>([]);
  const [comment, setComment] = useState("");
  const [tried, setTried] = useState(false);
  const { pending, error, run } = useWriteSubmit(
    () => setAsking(false),
    fr.framingJourney.done.briefValidated,
  );
  const lacksDims = tried && marked.length === 0;
  const lacksComment = tried && !comment.trim();
  const toggle = (d: Dimension) =>
    setMarked((all) =>
      all.includes(d) ? all.filter((x) => x !== d) : [...all, d],
    );
  const request = () => {
    setTried(true);
    if (marked.length === 0) return;
    if (!comment.trim()) {
      document.getElementById("brief-change-comment")?.focus();
      return;
    }
    run(
      () => decideFramingBrief(projectId, validationId, false, comment, marked),
      fr.framingJourney.done.changesRequested,
    );
  };

  const footer = asking ? (
    <>
      <h4 className="text-body-lg font-semibold">{t.requestChange}</h4>
      <p className="text-caption text-[color:var(--text-secondary)]">
        {marked.length
          ? t.markedList(
              marked.map((d) => fr.framingIntel.dimensions[d]).join(", "),
            )
          : t.markHint}
      </p>
      <FieldError id="brief-change-dims-error">
        {lacksDims ? t.dimsRequired : undefined}
      </FieldError>
      <TextareaField
        id="brief-change-comment"
        name="comment"
        label={t.whatChanges}
        rows={3}
        maxLength={2000}
        required
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        error={lacksComment ? t.commentRequired : undefined}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <div className="flex flex-wrap gap-2">
        <Button size="lg" disabled={pending} onClick={request}>
          {t.sendRequest}
        </Button>
        <Button
          size="lg"
          variant="outline"
          disabled={pending}
          onClick={() => {
            setAsking(false);
            setMarked([]);
            setTried(false);
          }}
        >
          {fr.framingIntel.guide.cancel}
        </Button>
      </div>
      <BriefDetailedRequest projectId={projectId} validationId={validationId} />
    </>
  ) : (
    <>
      <h4 className="text-body-lg font-semibold">{t.question}</h4>
      {openMandatory > 0 && (
        <ToneCallout tone="warning">
          {t.openRequests(openMandatory)}
        </ToneCallout>
      )}
      <FormMessage kind="error">{error}</FormMessage>
      <div className="flex flex-wrap gap-2">
        <Button
          size="lg"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={() =>
            run(() => decideFramingBrief(projectId, validationId, true, "", []))
          }
        >
          {t.approve}
        </Button>
        <Button
          size="lg"
          variant="outline"
          disabled={pending}
          onClick={() => setAsking(true)}
        >
          {t.requestChange}
        </Button>
      </div>
    </>
  );

  return (
    <SunkCard
      id="brief-version"
      title={card.title}
      meta={card.meta}
      status={card.status}
      actions={card.actions}
      footer={footer}
    >
      {card.changes && <BriefChanges>{card.changes}</BriefChanges>}
      <BriefVersionDoc
        snapshot={snapshot}
        marking={asking ? { marked, onToggle: toggle } : undefined}
      />
    </SunkCard>
  );
}
