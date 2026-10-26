"use client";

import { Field } from "@/components/auth/field";
import { HolderSelect } from "@/components/production/holder-select";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";

const t = fr.productionReady;

export type PlanDraft = Record<string, { who: string; due: string }>;

/**
 * The catch-up plan of a derogation before the shoot (recette 23/10,
 * MKT-PROD-002): for each critical line not ready, who settles it (a
 * member) and before when.
 */
export function ReadyPlanFields({
  lines,
  members,
  draft,
  today,
  errors,
  onChange,
}: {
  lines: { key: string; label: string }[];
  members: Member[];
  draft: PlanDraft;
  // Paris's day (ISO): no deadline before it.
  today: string;
  errors: Record<string, string>;
  onChange: (key: string, value: { who: string; due: string }) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="font-semibold">{t.plan.title}</legend>
      <p className="text-[color:var(--text-secondary)]">{t.plan.hint}</p>
      <ul className="flex flex-col gap-3">
        {lines.map((l) => {
          const value = draft[l.key] ?? { who: "", due: "" };
          return (
            <li
              key={l.key}
              className="flex flex-col gap-3 rounded-xl border border-[color:var(--border-hairline)] p-3"
            >
              <b className="font-semibold">{l.label}</b>
              <div className="grid gap-3 sm:grid-cols-2">
                <HolderSelect
                  id={`plan-who-${l.key}`}
                  label={t.plan.who}
                  noneLabel={t.plan.none}
                  value={value.who}
                  members={members}
                  contacts={[]}
                  required
                  error={errors[`who-${l.key}`]}
                  onChange={(who) => onChange(l.key, { ...value, who })}
                />
                <Field
                  id={`plan-due-${l.key}`}
                  name={`plan-due-${l.key}`}
                  type="date"
                  label={t.plan.due}
                  min={today}
                  aria-required
                  value={value.due}
                  error={errors[`due-${l.key}`]}
                  onChange={(e) =>
                    onChange(l.key, { ...value, due: e.target.value })
                  }
                />
              </div>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
