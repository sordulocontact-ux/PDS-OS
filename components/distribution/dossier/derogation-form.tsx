"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { ChipMultiChoice } from "@/components/ui/chip-choice";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { VersionCard } from "@/components/ui/version-card";
import {
  grantDerogation,
  revokeDerogation,
} from "@/lib/distribution/dossier-actions";
import {
  DEROGATION_SCOPES,
  type DerogationScope,
} from "@/lib/distribution/validation";
import { distributionJourney } from "@/lib/i18n/fr/distribution-journey";
import { todayInParis } from "@/lib/insights/dates";

const fr = { distributionJourney };

const t = fr.distributionJourney.derogation;

/**
 * « Accorder une dérogation » (the direction, recette DIST-001): what it
 * lets through — preselected with what blocks now —, the risk accepted,
 * the reason and the deadline, each in red with its reason after a first
 * try. The next submission uses it; the validator reads it on the version.
 */
export function DerogationForm({
  projectId,
  blocking,
}: {
  projectId: string;
  blocking: DerogationScope[];
}) {
  const [scope, setScope] = useState<DerogationScope[]>(blocking);
  const [risk, setRisk] = useState("");
  const [reason, setReason] = useState("");
  const [due, setDue] = useState("");
  const [tried, setTried] = useState(false);
  const { pending, error, run } = useWriteSubmit(() => {
    setTried(false);
    setRisk("");
    setReason("");
    setDue("");
  }, t.granted);
  const today = todayInParis();
  const errors = {
    scope: scope.length === 0 ? t.scopeRequired : undefined,
    risk: !risk.trim() ? t.riskRequired : undefined,
    reason: !reason.trim() ? t.reasonRequired : undefined,
    due: !due || due < today ? t.dueRequired : undefined,
  };
  const submit = () => {
    setTried(true);
    if (Object.values(errors).some(Boolean)) return;
    run(() =>
      grantDerogation({
        projectId,
        scope,
        risk: risk.trim(),
        reason: reason.trim(),
        dueOn: due,
      }),
    );
  };
  return (
    <VersionCard title={t.title}>
      <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
        {t.body}
      </p>
      <ChipMultiChoice
        name="derogation-scope"
        legend={t.scope}
        required
        options={DEROGATION_SCOPES.map((value) => ({
          value,
          label: t.scopes[value],
        }))}
        defaultValue={blocking}
        onChange={setScope}
        error={tried ? errors.scope : undefined}
      />
      <TextareaField
        name="derogation-risk"
        label={t.risk}
        required
        rows={2}
        maxLength={1000}
        value={risk}
        onChange={(e) => setRisk(e.target.value)}
        error={tried ? errors.risk : undefined}
      />
      <TextareaField
        name="derogation-reason"
        label={t.reason}
        required
        rows={2}
        maxLength={2000}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        error={tried ? errors.reason : undefined}
      />
      <Field
        name="derogation-due"
        label={t.due}
        type="date"
        required
        min={today}
        value={due}
        onChange={(e) => setDue(e.target.value)}
        error={tried ? errors.due : undefined}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <div>
        <Button
          variant="outline"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={submit}
        >
          {t.grant}
        </Button>
      </div>
    </VersionCard>
  );
}

/** « Retirer la dérogation » while no submission used it. */
export function RevokeDerogation({ projectId }: { projectId: string }) {
  const { pending, error, run } = useWriteSubmit(() => {}, t.revoked);
  return (
    <span className="flex flex-col gap-1.5">
      <FormMessage kind="error">{error}</FormMessage>
      <span>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => run(() => revokeDerogation({ projectId }))}
        >
          {t.revoke}
        </Button>
      </span>
    </span>
  );
}
