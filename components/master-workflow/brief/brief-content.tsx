"use client";

import { useTransition } from "react";
import { toast } from "@/components/ui/toast";

import { FactRow, FactRows } from "@/components/ui/fact-row";
import { FilterChip } from "@/components/ui/filter-chip";
import { masterBrief } from "@/lib/i18n/fr/master-brief";
import { masterWorkflow } from "@/lib/i18n/fr/master-workflow";
import { saveBriefFact } from "@/lib/master-workflow/brief-fact-actions";
import {
  BRIEF_DATES,
  BRIEF_DELIVERABLES,
  type BriefDate,
  type MasterBrief,
} from "@/lib/master-workflow/brief-types";
import type { Tone } from "@/lib/ui/state-tones";
import { formatDay } from "@/lib/utils/day";

const fr = { masterWorkflow, masterBrief };

const t = fr.masterBrief;
const labels = fr.masterWorkflow.brief.deliverables;
// The workflow's own results: always delivered.
const FIXED = ["mix_final", "master_final"];

const sectionTitle =
  "text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-semibold";

type Props = {
  projectId: string;
  canEdit: boolean;
  brief: MasterBrief;
  dates: Record<BriefDate, { value: string | null; proposed: boolean }>;
  masterFinalFromFraming: boolean;
  // What the Distribution asks of the audio (/app/settings).
  distributionFormats: string | null;
  // The question of the direction to a creative director, while it is
  // not in the Brief: « Demandée à … », then « Réponse de … à ajouter ».
  directionState?: { tone: Tone; label: string } | null;
  changedBy: Partial<Record<string, string>>;
};

const COLUMN: Record<BriefDate, string> = {
  mixV1Due: "mix_v1_due",
  mixFinalDue: "mix_final_due",
  masteringDue: "mastering_due",
  masterFinalDue: "master_final_due",
};

/**
 * Direction artistique, Livrables et formats, Dates and Message of the
 * Brief (proto `master-v2.html`): each fact with its source, « Modifier »
 * in place, saved at once; the dates proposed by the code from the master
 * final, said in full, their order refused by the code.
 */
export function BriefContent(props: Props) {
  const { brief, canEdit, projectId, changedBy } = props;
  // The Brief's own formats, else what the Distribution asks (ticket § 14).
  const formats = brief.formats ?? props.distributionFormats;
  const save = (patch: Parameters<typeof saveBriefFact>[1]) =>
    saveBriefFact(projectId, patch);
  const textEdit = (
    field: "direction" | "references" | "constraints" | "message",
  ) =>
    canEdit
      ? {
          value: brief[field] ?? "",
          optional: true,
          done: t.changed,
          onSave: (value: string) => save({ [field]: value || null }),
        }
      : null;
  return (
    <>
      <section className="flex flex-col gap-2.5">
        <h3 className={sectionTitle}>{t.sections.direction}</h3>
        <FactRows>
          {(["direction", "references", "constraints"] as const).map((f) => (
            <FactRow
              openOnRow
              key={f}
              label={t.fields[f]}
              value={brief[f]}
              missingAs="badge"
              missingLabel={t.toFill}
              state={f === "direction" ? props.directionState : null}
              missing={
                !brief.direction &&
                !brief.references &&
                !brief.constraints &&
                f === "direction"
              }
              source={null}
              edit={textEdit(f)}
            />
          ))}
        </FactRows>
      </section>

      <section className="flex flex-col gap-2.5">
        <h3 className={sectionTitle}>{t.sections.deliverables}</h3>
        <Deliverables {...props} />
        <FactRows>
          <FactRow
            openOnRow
            label={t.fields.formats}
            value={formats}
            source={
              !brief.formats && props.distributionFormats
                ? t.sources.formatsDistribution
                : null
            }
            changedBy={changedBy.delivery_formats}
            edit={
              canEdit
                ? {
                    value: formats ?? "",
                    optional: true,
                    done: t.changed,
                    onSave: (value: string) => save({ formats: value || null }),
                  }
                : null
            }
          />
        </FactRows>
      </section>

      <section className="flex flex-col gap-2.5">
        <h3 className={sectionTitle}>{t.sections.dates}</h3>
        <FactRows>
          {BRIEF_DATES.map((key) => {
            const d = props.dates[key];
            return (
              <FactRow
                openOnRow
                key={key}
                label={t.fields[key]}
                value={d.value ? formatDay(d.value) : null}
                missingAs="badge"
                missingLabel={t.toFill}
                missing={!d.value && key === "masterFinalDue"}
                // Proposed by the code, not yet in the Brief.
                state={
                  d.proposed ? { tone: "warning", label: t.toConfirm } : null
                }
                source={
                  key === "masterFinalDue"
                    ? props.masterFinalFromFraming
                      ? t.sources.dates.masterFinalDue
                      : null
                    : t.sources.dates[key]
                }
                changedBy={changedBy[COLUMN[key]]}
                edit={
                  canEdit
                    ? {
                        kind: "date",
                        value: d.value ?? "",
                        proposal: d.value ? formatDay(d.value) : undefined,
                        optional: key !== "masterFinalDue",
                        done: t.changed,
                        onSave: (value) => save({ [key]: value || null }),
                      }
                    : null
                }
              />
            );
          })}
        </FactRows>
      </section>

      <section className="flex flex-col gap-2.5">
        <h3 className={sectionTitle}>{t.sections.message}</h3>
        <FactRows>
          <FactRow
            openOnRow
            label={t.fields.message}
            value={brief.message}
            edit={textEdit("message")}
          />
        </FactRows>
      </section>
    </>
  );
}

/** The deliverables as pills: the two masters fixed, the others toggled
 * and saved at once. */
function Deliverables({ projectId, canEdit, brief }: Props) {
  const [pending, start] = useTransition();
  const toggle = (key: string) =>
    start(async () => {
      const next = brief.deliverables.includes(key as never)
        ? brief.deliverables.filter((d) => d !== key)
        : [...brief.deliverables, key];
      const result = await saveBriefFact(projectId, { deliverables: next });
      if (!result.ok) toast.error(result.error);
    });
  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="group"
        aria-label={t.fields.deliverables}
        className="flex flex-wrap gap-2"
      >
        {BRIEF_DELIVERABLES.map((key) => (
          <FilterChip
            key={key}
            pressed={brief.deliverables.includes(key)}
            disabled={!canEdit || FIXED.includes(key) || pending}
            onClick={() => toggle(key)}
          >
            {labels[key]}
          </FilterChip>
        ))}
      </div>
      <p className="text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]">
        {t.sources.fixed}
      </p>
    </div>
  );
}
