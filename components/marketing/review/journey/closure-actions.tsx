"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { DecisionPanel } from "@/components/ui/decision-panel";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import {
  decideClosure,
  reopenClosure,
  requestClosure,
} from "@/lib/marketing/closure/closure-actions";

const t = fr.reviewJourney.closure;

/** « Demander la clôture » (proto `cloreq`): straight, no note. */
export function RequestClosureButton({
  projectId,
  reportId,
}: {
  projectId: string;
  reportId: string;
}) {
  const { pending, error, run } = useWriteSubmit(() => undefined, t.requested);
  return (
    <div className="flex flex-col gap-2">
      <FormMessage kind="error">{error}</FormMessage>
      <div>
        <Button
          type="button"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={() =>
            run(() => requestClosure({ projectId, reportId, note: "" }))
          }
        >
          {t.request}
        </Button>
      </div>
    </div>
  );
}

/**
 * « Votre décision » on the closing asked (proto `clodecide`): close — with
 * reserves when some are followed after it or accepted as limits, the
 * code chooses — or ask for corrections; « Reporter la décision » (ticket)
 * last. A reason for anything but closing.
 */
export function ClosureDecisionPanel({
  projectId,
  closureId,
  withReserves,
}: {
  projectId: string;
  closureId: string;
  withReserves: boolean;
}) {
  const d = t.decision;
  return (
    <DecisionPanel
      id="closure-decision"
      commentHint={null}
      commentPlaceholder={d.placeholder}
      commentRequired={d.required}
      outcomes={[
        {
          kind: "approve",
          label: withReserves ? d.closeWith : d.closeClean,
          done: d.closed,
        },
        { kind: "request_changes", label: d.changes, done: d.changesDone },
        { kind: "request_info", label: d.postpone, done: d.postponed },
      ]}
      onDecide={(kind, comment) =>
        decideClosure({
          projectId,
          closureId,
          decision:
            kind === "approve"
              ? withReserves
                ? "closed_with_reserves"
                : "closed_clean"
              : kind === "request_info"
                ? "postponed"
                : "changes_requested",
          comment,
        })
      }
    />
  );
}

/** « Rouvrir le Marketing » in place, with its reason (proto `reopen`). */
export function ReopenForm({
  projectId,
  closureId,
}: {
  projectId: string;
  closureId: string;
}) {
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(
    () => setMissing(false),
    t.reopened,
  );
  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const reason = String(
          new FormData(event.currentTarget).get("reason") ?? "",
        ).trim();
        setMissing(!reason);
        if (!reason) {
          document.getElementById("closure-reopen")?.focus();
          return;
        }
        run(() => reopenClosure({ projectId, closureId, reason }));
      }}
    >
      <h3 className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-semibold">
        {t.reopenTitle}
      </h3>
      <TextareaField
        id="closure-reopen"
        name="reason"
        label={t.reason}
        placeholder={t.reasonPlaceholder}
        required
        rows={2}
        maxLength={2000}
        error={missing ? t.reasonRequired : undefined}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <div>
        <Button
          type="submit"
          variant="outline"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {t.reopen}
        </Button>
      </div>
    </form>
  );
}
