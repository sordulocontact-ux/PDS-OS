"use client";

import { useTransition } from "react";
import { toast } from "sonner";

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
  const save = (patch: Parameters<typeof saveBriefFact>[1]) =>
    saveBriefFact(projectId, patch);
  const textEdit = (
    field: "direction" | "references" | "constraints" | "formats" | "message",
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
              key={f}
              label={t.fields[f]}
              value={brief[f]}
              missing={
                !brief.direction &&
                !brief.references &&
                !brief.constraints &&
                f === "direction"
              }
              source={brief[f] ? t.sources.typed : null}
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
            label={t.fields.formats}
            value={brief.formats}
            source={brief.formats ? t.sources.typed : null}
            changedBy={changedBy.delivery_formats}
            edit={textEdit("formats")}
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
                key={key}
                label={t.fields[key]}
                value={d.value ? formatDay(d.value) : null}
                missing={!d.value && key === "masterFinalDue"}
                source={
                  key === "masterFinalDue"
                    ? props.masterFinalFromFraming
                      ? t.sources.dates.masterFinalDue
                      : t.sources.typed
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
