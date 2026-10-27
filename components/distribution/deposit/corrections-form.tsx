"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { VersionCard } from "@/components/ui/version-card";
import {
  ANOMALY_KINDS,
  ANOMALY_MODULES,
  DEFAULT_MODULE,
  SEVERITIES,
  type AnomalyKind,
  type AnomalyModule,
  type Severity,
} from "@/lib/distribution/anomalies";
import { declareCorrections } from "@/lib/distribution/declare-actions";
import { distribution } from "@/lib/i18n/fr/distribution";
import { distributionJourney } from "@/lib/i18n/fr/distribution-journey";

const fr = { distribution, distributionJourney };

const t = fr.distributionJourney.orchard;
const a = fr.distribution.anomalies;

/**
 * « The Orchard demande des corrections », folded under the answers (proto
 * `altBlock`): what it asks, the anomaly's type, the module where it is
 * corrected and its gravity — then the declaration, the anomaly and the next
 * version of the dossier in one gesture.
 */
export function CorrectionsForm({
  projectId,
  next,
}: {
  projectId: string;
  // The number of the version that will be prepared.
  next: number;
}) {
  const [note, setNote] = useState("");
  const [kind, setKind] = useState<AnomalyKind>("credit_isrc");
  const [module, setModule] = useState<AnomalyModule>(
    DEFAULT_MODULE.credit_isrc,
  );
  const [severity, setSeverity] = useState<Severity>("major");
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(
    () => setNote(""),
    t.correctionsDone(next),
  );
  return (
    <VersionCard title={t.corrections} defaultOpen={false}>
      <TextareaField
        name="corrections"
        label={t.correctionsNote}
        required
        rows={3}
        maxLength={1000}
        placeholder={t.correctionsPlaceholder}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        error={missing ? t.correctionsRequired : undefined}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <OptionSelect
          name="kind"
          label={t.kind}
          required
          items={Object.fromEntries(ANOMALY_KINDS.map((k) => [k, a.kinds[k]]))}
          defaultValue={kind}
          onValueChange={(value: string) => {
            const k = value as AnomalyKind;
            setKind(k);
            setModule(DEFAULT_MODULE[k]);
          }}
        />
        <OptionSelect
          key={kind}
          name="module"
          label={t.module}
          required
          items={Object.fromEntries(
            ANOMALY_MODULES.map((m) => [m, a.modules[m]]),
          )}
          defaultValue={module}
          onValueChange={(value: string) => setModule(value as AnomalyModule)}
        />
      </div>
      <ChoiceCards
        name="severity"
        legend={t.severity}
        required
        columns={3}
        value={severity}
        onChange={setSeverity}
        choices={SEVERITIES.map((s) => ({ value: s, label: a.severities[s] }))}
      />
      <p className="text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]">
        {t.correctionsHint}
      </p>
      <FormMessage kind="error">{error}</FormMessage>
      <div>
        <Button
          variant="outline"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={() => {
            const lacking = !note.trim();
            setMissing(lacking);
            if (!lacking)
              run(() =>
                declareCorrections({
                  projectId,
                  note: note.trim(),
                  kind,
                  module,
                  severity,
                  next,
                }),
              );
          }}
        >
          {t.declareCorrections}
        </Button>
      </div>
    </VersionCard>
  );
}
