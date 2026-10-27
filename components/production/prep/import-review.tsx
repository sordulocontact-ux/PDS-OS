"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormMessage } from "@/components/auth/form-message";
import { ImportHeadcountField } from "@/components/production/prep/import-headcount-field";
import {
  briefTitle,
  briefValue,
  needTitle,
} from "@/components/production/prep/import-labels";
import { ImportProposalRow } from "@/components/production/prep/import-proposal-row";
import { Button } from "@/components/ui/button";
import { productionImport } from "@/lib/i18n/fr/production-import";
import { productionNeeds } from "@/lib/i18n/fr/production-needs";
import type { ProductionBrief } from "@/lib/production/brief";
import { applyProductionImport } from "@/lib/production/import";
import type { ProductionImportProposals } from "@/lib/production/import-proposal";
import { MAX_HEADCOUNT } from "@/lib/production/roles";

const fr = { productionNeeds, productionImport };

/**
 * The review of what PO read in a pasted organisation: every proposal kept
 * or dropped one by one, a topic already filled unticked until the person
 * chooses to replace it, the number of people of each need entered by the
 * person (1 by default). Nothing is written before « Appliquer ».
 */
export function ImportReview({
  projectId,
  sheetId,
  brief,
  proposals,
  onBack,
  onDone,
}: {
  projectId: string;
  sheetId: string;
  brief: ProductionBrief;
  proposals: ProductionImportProposals;
  onBack: () => void;
  onDone: () => void;
}) {
  const t = fr.productionImport;
  const [kept, setKept] = useState(
    () =>
      new Set([
        ...proposals.brief.filter((p) => !brief[p.field]).map((p) => p.id),
        ...proposals.needs.map((p) => p.id),
      ]),
  );
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [invalid, setInvalid] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toggle = (id: string) =>
    setKept((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  if (proposals.brief.length === 0 && proposals.needs.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <FormMessage kind="info">{t.review.empty}</FormMessage>
        <Actions onBack={onBack} />
      </div>
    );
  }

  const apply = () => {
    if (kept.size === 0) return setError(t.errors.nothing);
    const needs = proposals.needs.filter((n) => kept.has(n.id));
    const headcountOf = (id: string) => Number(counts[id] ?? "1");
    const wrong = needs.filter((n) => {
      const value = headcountOf(n.id);
      return !Number.isInteger(value) || value < 1 || value > MAX_HEADCOUNT;
    });
    setInvalid(new Set(wrong.map((n) => n.id)));
    if (wrong.length > 0) {
      document.getElementById(countIdOf(wrong[0].id))?.focus();
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await applyProductionImport({
        projectId,
        sheetId,
        brief: proposals.brief
          .filter((p) => kept.has(p.id))
          .map((p) => ({ field: p.field, value: p.value })),
        needs: needs.map((n) => ({
          family: n.family,
          roleKey: n.roleKey,
          label: n.label,
          speciality: n.speciality,
          headcount: headcountOf(n.id),
        })),
      });
      if (!result.ok) return setError(result.error);
      toast.success(t.review.applied);
      onDone();
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground">{t.review.hint}</p>
      {proposals.brief.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="pi-brief">
          <h3 id="pi-brief" className="font-semibold">
            {t.review.brief}
          </h3>
          <ul className="flex flex-col gap-3">
            {proposals.brief.map((p) => {
              const current = brief[p.field];
              return (
                <ImportProposalRow
                  key={p.id}
                  id={p.id}
                  checked={kept.has(p.id)}
                  disabled={pending}
                  onToggle={() => toggle(p.id)}
                  title={briefTitle(p.field)}
                  value={briefValue(p.field, p.value)}
                  before={current ? briefValue(p.field, current) : null}
                  quote={p.quote}
                />
              );
            })}
          </ul>
        </section>
      )}
      {proposals.needs.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="pi-needs">
          <div className="flex flex-col gap-1">
            <h3 id="pi-needs" className="font-semibold">
              {t.review.needs}
            </h3>
            <p className="text-caption text-muted-foreground">
              {t.review.needsHint}
            </p>
          </div>
          <ul className="flex flex-col gap-3">
            {proposals.needs.map((n) => {
              return (
                <ImportProposalRow
                  key={n.id}
                  id={n.id}
                  checked={kept.has(n.id)}
                  disabled={pending}
                  onToggle={() => toggle(n.id)}
                  title={fr.productionNeeds.families[n.family]}
                  value={needTitle(n)}
                  quote={n.quote}
                >
                  {kept.has(n.id) && (
                    <ImportHeadcountField
                      id={countIdOf(n.id)}
                      value={counts[n.id] ?? "1"}
                      invalid={invalid.has(n.id)}
                      disabled={pending}
                      onChange={(value) => {
                        setCounts((c) => ({ ...c, [n.id]: value }));
                        setInvalid((current) => {
                          const next = new Set(current);
                          next.delete(n.id);
                          return next;
                        });
                      }}
                    />
                  )}
                </ImportProposalRow>
              );
            })}
          </ul>
        </section>
      )}
      <FormMessage kind="error">{error}</FormMessage>
      <Actions onBack={onBack} pending={pending}>
        <Button type="button" size="lg" disabled={pending} onClick={apply}>
          {pending ? t.review.applying : t.review.apply(kept.size)}
        </Button>
      </Actions>
    </div>
  );
}

const countIdOf = (id: string) =>
  `production-import-count-${id.replace(":", "-")}`;

/** « Modifier le texte » (ghost), then the main action when there is one. */
function Actions({
  onBack,
  pending = false,
  children,
}: {
  onBack: () => void;
  pending?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button
        type="button"
        variant="ghost"
        size="lg"
        disabled={pending}
        onClick={onBack}
      >
        {fr.productionImport.review.back}
      </Button>
      {children}
    </div>
  );
}
