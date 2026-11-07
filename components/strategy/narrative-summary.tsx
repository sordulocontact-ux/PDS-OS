"use client";

import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";

import { BriefFieldCard } from "@/components/framing/brief-field-card";
import { useCanEditProject } from "@/components/projects/edit-access";
import { Button } from "@/components/ui/button";
import { ChipChoice } from "@/components/ui/chip-choice";
import { ToneCallout } from "@/components/ui/tone-callout";
import type { FieldState, NarrativePart } from "@/lib/framing/brief";
import { framing } from "@/lib/i18n/fr/framing";
import { strategyDraft } from "@/lib/i18n/fr/strategy-draft";
import { strategyPilot } from "@/lib/i18n/fr/strategy-pilot";
import { writeNarrativeSummary } from "@/lib/strategy/actions/draft";
import {
  narrativeRepetitions,
  SUMMARY_LENGTHS,
  SUMMARY_TONES,
  type NarrativeArbitration,
  type SummaryLength,
  type SummaryTone,
} from "@/lib/strategy/narrative-review";

const fr = { framing, strategyPilot, strategyDraft };

/**
 * « Synthèse du récit » (MKT-S1-06), first in the narrative: the synthesis
 * itself (a proposal of PO until confirmed, edited like any part), the tone
 * and length to write it in, then what to arbitrate: the repetitions
 * between parts, found by the code at every render, and the contradictions
 * PO pointed when it last wrote (quotes verified in their part).
 */
export function NarrativeSummary({
  field,
  parts,
  projectId,
}: {
  field: FieldState;
  parts: FieldState<NarrativePart>[];
  projectId: string;
}) {
  const t = fr.strategyDraft.summary;
  const partLabels: Record<string, string> = fr.strategyPilot.narrative.parts;
  const canEdit = useCanEditProject();
  const [pending, startTransition] = useTransition();
  const [tone, setTone] = useState<SummaryTone>("sober");
  const [length, setLength] = useState<SummaryLength>("short");
  const [contradictions, setContradictions] = useState<NarrativeArbitration[]>(
    [],
  );

  const written = parts.flatMap((p) =>
    p.value ? [{ key: p.key, text: p.value }] : [],
  );
  const arbitrations = [
    ...narrativeRepetitions(written),
    ...contradictions.filter((c) =>
      written.some((p) => p.key === c.first || p.key === c.second),
    ),
  ];
  const canWrite = canEdit && field.status !== "confirmed";

  function write() {
    startTransition(async () => {
      const result = await writeNarrativeSummary(projectId, tone, length);
      if (result.ok) {
        toast(t.written);
        setContradictions(
          result.arbitrations.filter((a) => a.kind === "contradiction"),
        );
      } else if (result.error === "no_parts") toast(t.noParts);
      else if (result.error === "confirmed") toast(t.confirmed);
      else if (result.error === "stage_locked")
        toast.error(fr.framing.errors.stage_locked);
      else toast.error(result.error === "quota" ? result.message : t.failed);
    });
  }

  return (
    <section
      id="answer-narrative_summary"
      aria-labelledby="narrative-summary-title"
      className="flex scroll-mt-24 flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <h3 id="narrative-summary-title" className="text-body-md font-semibold">
          {t.title}
        </h3>
        <p className="text-body-md text-muted-foreground">{t.hint}</p>
      </div>

      {field.value && (
        <BriefFieldCard
          key={`${field.value}-${field.status ?? ""}`}
          field={field}
          label={t.title}
          projectId={projectId}
        />
      )}

      {/* Nothing to write from yet: one sentence, no settings nor a
          button that cannot work. */}
      {canWrite && written.length === 0 && !field.value && (
        <p className="text-caption text-[color:var(--text-tertiary)]">
          {t.noParts}
        </p>
      )}
      {canWrite && (written.length > 0 || field.value) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <ChipChoice
            name="summary-tone"
            legend={t.tone}
            options={SUMMARY_TONES.map((v) => ({
              value: v,
              label: t.tones[v],
            }))}
            value={tone}
            onChange={(v) => v && setTone(v)}
          />
          <ChipChoice
            name="summary-length"
            legend={t.length}
            options={SUMMARY_LENGTHS.map((v) => ({
              value: v,
              label: t.lengths[v],
            }))}
            value={length}
            onChange={(v) => v && setLength(v)}
          />
          <Button
            className="sm:ml-auto"
            onClick={write}
            disabled={pending || written.length === 0}
            aria-busy={pending || undefined}
            title={written.length === 0 ? t.noParts : undefined}
          >
            {pending ? t.writing : field.value ? t.rewrite : t.write}
          </Button>
        </div>
      )}

      {arbitrations.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-body-md font-semibold">{t.arbitrationTitle}</h4>
          <ul className="flex flex-col gap-2">
            {arbitrations.map((a) => (
              <li key={`${a.kind}-${a.first}-${a.second}`}>
                <ToneCallout tone="warning">
                  {a.kind === "repetition"
                    ? t.repetition(partLabels[a.first], partLabels[a.second])
                    : t.contradiction(
                        partLabels[a.first],
                        partLabels[a.second],
                      )}
                  <span className="mt-1 block text-caption">
                    {a.kind === "repetition"
                      ? t.passage(a.passage)
                      : `« ${a.firstQuote} » · « ${a.secondQuote} » — ${a.why}`}
                  </span>
                </ToneCallout>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
