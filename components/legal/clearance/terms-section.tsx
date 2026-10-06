"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { feeCentsOf, formatFee } from "@/lib/legal/contracts/fields";
import { fr } from "@/lib/i18n/fr";
import { isClosed } from "@/lib/legal/clearance/matrix";
import { decideTerms, proposeTerms } from "@/lib/legal/clearance/terms-actions";
import type { Clearance } from "@/lib/legal/clearance/types";

import { useLegalAction } from "@/components/legal/use-legal-action";

const TONE = {
  proposed: "warning",
  validated: "success",
  rejected: "danger",
} as const;

/** Conditions received, proposed until the director validates them (« Les
 * conditions … restent proposées jusqu'à validation PDS »). */
export function TermsSection({
  projectId,
  clearance,
  canValidate,
}: {
  projectId: string;
  clearance: Clearance;
  canValidate: boolean;
}) {
  const t = fr.legalClearance.drawer;
  const blank = {
    amount: "",
    share: "",
    credits: "",
    territory: "",
    duration: "",
    other: "",
  };
  const [form, setForm] = useState(blank);
  const { pending, run } = useLegalAction();
  if (clearance.scope === "none" || clearance.scope === null) return null;
  const closed = isClosed(clearance.status);
  const set =
    (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));
  const any = Object.values(form).some((v) => v.trim());

  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-medium">{t.terms}</h3>
      {clearance.terms.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.termsEmpty}</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {clearance.terms.map((term) => (
            <li
              key={term.id}
              className="flex flex-col gap-2 py-2 sm:flex-row sm:items-start sm:justify-between"
            >
              <span className="min-w-0 text-sm break-words">
                {[
                  term.amountCents !== null &&
                    `${t.amount} : ${formatFee(term.amountCents)}`,
                  term.share && `${t.share} : ${term.share}`,
                  term.credits && `${t.credits} : ${term.credits}`,
                  term.territory && `${t.territory} : ${term.territory}`,
                  term.duration && `${t.duration} : ${term.duration}`,
                  term.other,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              <span className="flex shrink-0 flex-wrap items-center gap-2">
                <StatusBadge tone={TONE[term.status]} size="sm">
                  {t.termsStatus[term.status]}
                </StatusBadge>
                {canValidate && term.status === "proposed" && !closed && (
                  <>
                    <Button
                      size="xs"
                      disabled={pending}
                      onClick={() =>
                        run(() => decideTerms(projectId, term.id, true))
                      }
                    >
                      {t.validate}
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        run(() => decideTerms(projectId, term.id, false))
                      }
                    >
                      {t.reject}
                    </Button>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {!closed && (
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field
              name={`amount-${clearance.id}`}
              label={t.amount}
              suffix="€"
              inputMode="decimal"
              value={form.amount}
              onChange={set("amount")}
            />
            <Field
              name={`share-${clearance.id}`}
              label={t.share}
              value={form.share}
              onChange={set("share")}
            />
            <Field
              name={`credits-${clearance.id}`}
              label={t.credits}
              value={form.credits}
              onChange={set("credits")}
            />
            <Field
              name={`territory-${clearance.id}`}
              label={t.territory}
              value={form.territory}
              onChange={set("territory")}
            />
            <Field
              name={`duration-${clearance.id}`}
              label={t.duration}
              value={form.duration}
              onChange={set("duration")}
            />
            <Field
              name={`other-${clearance.id}`}
              label={t.other}
              value={form.other}
              onChange={set("other")}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="self-end"
            disabled={
              pending ||
              !any ||
              (form.amount.trim() !== "" &&
                feeCentsOf(form.amount) === null &&
                form.amount.trim() !== "0")
            }
            onClick={() =>
              run(
                () =>
                  proposeTerms({
                    projectId,
                    clearanceId: clearance.id,
                    communicationId: null,
                    terms: {
                      right: null,
                      amountCents: form.amount.trim()
                        ? (feeCentsOf(form.amount) ?? 0)
                        : null,
                      share: form.share,
                      credits: form.credits,
                      territory: form.territory,
                      duration: form.duration,
                      other: form.other,
                    },
                  }),
                () => setForm(blank),
              )
            }
          >
            {t.proposeTerms}
          </Button>
        </div>
      )}
    </section>
  );
}
