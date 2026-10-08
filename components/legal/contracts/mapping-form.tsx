"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { approveContractMapping } from "@/lib/legal/contracts/actions";
import { feeCentsOf } from "@/lib/legal/contracts/fields";
import type { AgreementRow } from "@/lib/legal/contracts/mapping";
import { Checkbox } from "@/components/ui/checkbox";

type Choice = { needed: boolean; templateId: string | null; fee: string };

const feeText = (cents: number | null) =>
  cents === null ? "" : String(cents / 100).replace(".", ",");

/**
 * The mapping as the code proposes it, corrected and approved at once
 * (« Justine valide ou corrige la cartographie en une fois »). A person
 * without a contact waits for their fiche; a generated agreement is fixed.
 */
export function MappingForm({
  projectId,
  rows,
  onDone,
  onCancel,
}: {
  projectId: string;
  rows: AgreementRow[];
  onDone: () => void;
  onCancel?: () => void;
}) {
  const t = fr.legalContracts.agreements;
  const open = rows.filter((r) => r.contactId && !r.contract);
  const [choices, setChoices] = useState<Record<string, Choice>>(() =>
    Object.fromEntries(
      open.map((r) => [
        r.key,
        {
          needed: r.proposal.needed,
          templateId: r.proposal.templateId,
          fee: feeText(r.proposal.feeCents),
        },
      ]),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = (key: string, change: Partial<Choice>) =>
    setChoices((all) => ({ ...all, [key]: { ...all[key], ...change } }));

  function submit() {
    // A typed fee that is not a plain amount is refused, not dropped.
    const typed = (c: Choice) => (c.needed ? c.fee.trim() : "");
    if (
      open.some(
        (r) =>
          typed(choices[r.key]) && feeCentsOf(typed(choices[r.key])) === null,
      )
    )
      return setError(t.errors.fee);
    const items = open.map((r) => {
      const c = choices[r.key];
      return {
        key: r.key,
        needed: c.needed,
        templateId: c.needed ? c.templateId : null,
        feeCents: typed(c) ? feeCentsOf(typed(c)) : null,
      };
    });
    startTransition(async () => {
      const result = await approveContractMapping({ projectId, items });
      if (!result.ok) return setError(result.error);
      onDone();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col divide-y">
        {rows.map((row) => {
          const c = choices[row.key];
          return (
            <li key={row.key} className="flex flex-col gap-3 py-4 first:pt-0">
              <div className="flex flex-col gap-0.5">
                <span className="font-medium break-words">{row.name}</span>
                <span className="text-sm text-muted-foreground">
                  {row.creditRoles
                    .map((role) => fr.masterPage.credits.roles[role])
                    .join(" · ")}
                </span>
              </div>
              {!row.contactId ? (
                <Link
                  href={routes.projectLegalStep(projectId, "forms")}
                  className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                  {t.noContact}
                </Link>
              ) : row.contract ? (
                <span className="text-sm text-muted-foreground">
                  {t.states[row.state]}
                </span>
              ) : (
                <div className="flex flex-col gap-3">
                  <label className="flex w-fit items-center gap-3 rounded-xl border px-3 py-2 has-checked:border-selection has-checked:bg-selection-bg">
                    <Checkbox
                      className="shrink-0"
                      checked={c.needed}
                      onChange={(event) =>
                        set(row.key, { needed: event.target.checked })
                      }
                    />
                    <span className="font-medium">{t.needed}</span>
                  </label>
                  {row.existing && (
                    <span className="text-sm text-muted-foreground">
                      {t.existing(row.existing.title)}
                    </span>
                  )}
                  {c.needed && (
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
                      {row.compatible.length > 0 ? (
                        <OptionSelect
                          name={`template-${row.key}`}
                          label={t.columns.template}
                          items={Object.fromEntries(
                            row.compatible.map((o) => [o.id, o.label]),
                          )}
                          defaultValue={row.proposal.templateId}
                          onValueChange={(value) =>
                            set(row.key, { templateId: value })
                          }
                        />
                      ) : (
                        <p className="self-end text-sm text-muted-foreground">
                          {t.noCompatible}
                        </p>
                      )}
                      <Field
                        name={`fee-${row.key}`}
                        label={
                          row.proposal.feeFromFiche
                            ? `${t.columns.fee} · ${t.feeFromFiche}`
                            : t.columns.fee
                        }
                        aria-label={t.feeLabel(row.name)}
                        inputMode="decimal"
                        suffix="€"
                        value={c.fee}
                        onChange={(event) =>
                          set(row.key, { fee: event.target.value })
                        }
                      />
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
            {t.cancelEdit}
          </Button>
        )}
        <Button
          type="button"
          size="lg"
          disabled={pending || open.length === 0}
          aria-busy={pending || undefined}
          onClick={submit}
        >
          {pending ? t.approving : t.approveMapping}
        </Button>
      </div>
    </div>
  );
}
