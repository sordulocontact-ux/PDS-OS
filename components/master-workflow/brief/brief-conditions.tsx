"use client";

import { FactRow, FactRows } from "@/components/ui/fact-row";
import { masterBrief } from "@/lib/i18n/fr/master-brief";
import { saveBriefFact } from "@/lib/master-workflow/brief-fact-actions";
import { parseEurosToCents } from "@/lib/projects/schemas";
import { amountInput, formatAmount } from "@/lib/utils/money";

import { engineerOf, type BriefFactsProps } from "./brief-people";

const fr = { masterBrief };

const t = fr.masterBrief;

/**
 * « Conditions de prestation »: the correction rounds included and the
 * internal rates (the owner and the direction only). The people sit above,
 * in `BriefPeople`. Each change is saved at once.
 */
export function BriefConditions(props: BriefFactsProps) {
  const { brief, canEdit, projectId, changedBy } = props;
  const usual = props.usualRevisions;
  const save = (patch: Parameters<typeof saveBriefFact>[1]) =>
    saveBriefFact(projectId, patch);
  const mix = engineerOf(props, brief.mixContactId, brief.mixPersonId);
  const rateEdit = (field: "mixRateCents" | "masteringRateCents") =>
    canEdit
      ? {
          kind: "text" as const,
          value: brief[field] === null ? "" : amountInput(brief[field]!),
          optional: true,
          done: t.changed,
          onSave: async (value: string) => {
            const cents = parseEurosToCents(value);
            if (cents === undefined)
              return { ok: false as const, error: t.errors.amount };
            return save({ [field]: cents });
          },
        }
      : null;
  const rateValue = (cents: number | null) =>
    cents === null ? null : formatAmount(cents);
  return (
    <FactRows>
      <FactRow
        label={t.fields.revisions}
        value={brief.revisions === null ? null : t.revisions(brief.revisions)}
        source={
          brief.revisions === null
            ? null
            : usual && brief.revisions === usual.value
              ? t.sources.usualRevisions(usual.project)
              : null
        }
        changedBy={changedBy.revisions}
        below={
          <p className="text-caption text-[color:var(--text-secondary)]">
            {t.fields.revisionsHint}
          </p>
        }
        edit={
          canEdit
            ? {
                kind: "number",
                value:
                  brief.revisions !== null
                    ? String(brief.revisions)
                    : usual
                      ? String(usual.value)
                      : "",
                proposal:
                  brief.revisions === null && usual
                    ? `${t.revisions(usual.value)} · ${t.sources.usualRevisions(usual.project)}`
                    : undefined,
                optional: true,
                done: t.changed,
                onSave: async (value) => {
                  const n = value === "" ? null : Number(value);
                  if (n !== null && !(Number.isInteger(n) && n >= 0 && n <= 20))
                    return { ok: false, error: t.errors.revisions };
                  return save({ revisions: n });
                },
              }
            : null
        }
      />
      {props.canSeeBudget && (
        <>
          <FactRow
            label={mix ? `${t.fields.mixRate} · ${mix.name}` : t.fields.mixRate}
            value={rateValue(brief.mixRateCents)}
            state={
              brief.mixRateCents === null
                ? null
                : { tone: "neutral", label: t.sources.estimated }
            }
            changedBy={changedBy.mix_rate_cents}
            edit={rateEdit("mixRateCents")}
          />
          <FactRow
            label={t.fields.masteringRate}
            value={rateValue(brief.masteringRateCents)}
            state={
              brief.masteringRateCents === null
                ? null
                : { tone: "neutral", label: t.sources.estimated }
            }
            changedBy={changedBy.mastering_rate_cents}
            edit={rateEdit("masteringRateCents")}
          />
        </>
      )}
    </FactRows>
  );
}
