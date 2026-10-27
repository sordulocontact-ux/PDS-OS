"use client";

import { useRef, useState } from "react";

import { FormMessage, FieldError } from "@/components/auth/form-message";
import { useFramingAction } from "@/components/framing/use-framing-action";
import {
  ReserveRows,
  reserveErrors,
  type ReserveDraft,
} from "@/components/strategy/documents/reserve-rows";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { Label } from "@/components/ui/label";
import { RequiredMark } from "@/components/ui/required-mark";
import { Textarea } from "@/components/ui/textarea";
import { ToneCallout } from "@/components/ui/tone-callout";
import type { Member } from "@/lib/framing/related";
import { strategyDocuments } from "@/lib/i18n/fr/strategy-documents";
import { todayInParis } from "@/lib/insights/dates";
import { decideStrategyDocument } from "@/lib/strategy/actions/documents";

const fr = { strategyDocuments };

export type CriticalAlert = { key: string; text: string };

/**
 * A reviewer's decision on a version (MKT-S1-16): « Valider », « Valider
 * avec réserves » (each reserve with its owner and due date), or « Demander
 * une modification » with its reason. Every critical alert of the version
 * is accepted by name before approving. What is missing turns red with its
 * reason after the first try, counted above the buttons; the database
 * checks it all again.
 */
export function DecisionForm({
  projectId,
  documentId,
  criticalAlerts = [],
  members = [],
}: {
  projectId: string;
  documentId: string;
  criticalAlerts?: CriticalAlert[];
  // Who may own a reserve; none: no reserves offered (other documents).
  members?: Member[];
}) {
  const t = fr.strategyDocuments.review;
  const { pending, run } = useFramingAction();
  const [comment, setComment] = useState("");
  const [askedChange, setAskedChange] = useState(false);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [reserves, setReserves] = useState<ReserveDraft[] | null>(null);
  const [tried, setTried] = useState(false);
  const nextId = useRef(1);
  const alertsRef = useRef<HTMLFieldSetElement>(null);

  const newReserve = (): ReserveDraft => ({
    id: nextId.current++,
    text: "",
    ownerPersonId: "",
    dueOn: "",
  });
  const rows = reserves ?? [];
  const errors = tried ? reserveErrors(rows, todayInParis()) : {};
  const alertsMissing =
    tried && criticalAlerts.some((a) => !accepted.has(a.key));
  const missingCount =
    Object.values(errors).reduce((n, e) => n + Object.keys(e).length, 0) +
    (alertsMissing ? 1 : 0);

  function approve() {
    setTried(true);
    const problems = reserveErrors(rows, todayInParis());
    const unaccepted = criticalAlerts.some((a) => !accepted.has(a.key));
    if (unaccepted) {
      alertsRef.current?.querySelector("input")?.focus();
      return;
    }
    const first = Object.keys(problems)[0];
    if (first) {
      document.getElementById(`reserve-${first}-text`)?.focus();
      return;
    }
    run(() =>
      decideStrategyDocument(
        projectId,
        documentId,
        true,
        comment,
        [...accepted],
        rows.map((r) => ({
          text: r.text,
          ownerPersonId: r.ownerPersonId,
          dueOn: r.dueOn,
        })),
      ),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ToneCallout tone="action">{t.youDecide}</ToneCallout>

      {criticalAlerts.length > 0 && (
        <fieldset
          ref={alertsRef}
          aria-describedby={alertsMissing ? "alerts-error" : "alerts-hint"}
          className="flex flex-col gap-3"
        >
          <legend className="mb-1 text-body-md font-semibold">
            {t.alertsTitle}
            <RequiredMark announce />
          </legend>
          <p id="alerts-hint" className="text-caption text-muted-foreground">
            {t.alertsHint}
          </p>
          {criticalAlerts.map((alert) => (
            <CheckboxField
              key={alert.key}
              label={alert.text}
              checked={accepted.has(alert.key)}
              onChange={(on) =>
                setAccepted((set) => {
                  const next = new Set(set);
                  if (on) next.add(alert.key);
                  else next.delete(alert.key);
                  return next;
                })
              }
            />
          ))}
          {alertsMissing && (
            <FieldError id="alerts-error">{t.alertsMissing}</FieldError>
          )}
        </fieldset>
      )}

      <div className="grid gap-2">
        <Label htmlFor="decision-comment">{t.commentLabel}</Label>
        <Textarea
          id="decision-comment"
          rows={3}
          maxLength={2000}
          value={comment}
          aria-invalid={askedChange && comment.trim() === "" ? true : undefined}
          aria-describedby={
            askedChange && comment.trim() === "" ? "comment-error" : undefined
          }
          onChange={(e) => setComment(e.target.value)}
        />
        {askedChange && comment.trim() === "" && (
          <FieldError id="comment-error">{t.commentRequired}</FieldError>
        )}
      </div>

      {reserves && (
        <>
          <ReserveRows
            rows={rows}
            members={members}
            errors={errors}
            onChange={setReserves}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => setReserves([...rows, newReserve()])}
          >
            {t.addReserve}
          </Button>
        </>
      )}

      {missingCount > 0 && (
        <FormMessage kind="error">{t.missing(missingCount)}</FormMessage>
      )}

      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} onClick={approve}>
          {rows.length > 0 ? t.approveReserves(rows.length) : t.approve}
        </Button>
        {members.length > 0 &&
          (reserves ? (
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => setReserves(null)}
            >
              {t.cancelReserves}
            </Button>
          ) : (
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setReserves([newReserve()])}
            >
              {t.approveWithReserves}
            </Button>
          ))}
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => {
            if (comment.trim() === "") {
              setAskedChange(true);
              document.getElementById("decision-comment")?.focus();
              return;
            }
            run(() =>
              decideStrategyDocument(projectId, documentId, false, comment),
            );
          }}
        >
          {t.requestChanges}
        </Button>
      </div>
    </div>
  );
}
