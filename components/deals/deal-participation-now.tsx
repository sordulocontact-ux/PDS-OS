"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { nowHeading, nowSecondary } from "@/components/deals/now-classes";
import { Button, buttonVariants } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import type { ParticipationStep } from "@/lib/deals/participation-types";
import { dealMemos } from "@/lib/i18n/fr/deal-memos";
import {
  generateLegalContract,
  saveAgreementFee,
} from "@/lib/legal/contracts/actions";
import { amountInput } from "@/lib/utils/money";

const t = dealMemos.contract.now;

/**
 * The participation's contract in the deal's « Maintenant » while
 * contracting (Sacha 24/11/2026: « pourquoi Lina ne peut pas faire le
 * contrat depuis ici ? »): where it stands in its project's Juridique and
 * the Juridique's own gestures, for whoever prepares it there (the
 * project's owner); who it waits for, for the others. One contract, the
 * Juridique's: planned with the template PDS OS proposes and the fee,
 * completed by the person's fiche, generated (by itself once all is there).
 */
export function DealParticipationNow({ step }: { step: ParticipationStep }) {
  const router = useRouter();
  const refresh = () => router.refresh();
  const plan = useWriteSubmit(refresh, t.planned);
  const generate = useWriteSubmit(refresh, t.generated);
  const [fee, setFee] = useState(
    step.feeCents ? amountInput(step.feeCents) : "",
  );
  const owner = step.ownerName ?? t.theOwner;
  const error = plan.error ?? generate.error;
  const wait = (todo: string) => (
    <h2 className={nowHeading}>{t.waitOwner(owner, todo)}</h2>
  );
  const open = (href: string | null, label: string) =>
    href && (
      <Link href={href} className={buttonVariants({ variant: "outline" })}>
        {label}
      </Link>
    );

  let body: React.ReactNode;
  if (!step.state || !step.key) {
    body = (
      <>
        <p className={nowSecondary}>
          {t.noLine(step.person, step.projectTitle)}
        </p>
        {step.canAct && (
          <div className="flex flex-wrap gap-2">
            {open(step.hrefs.plan, t.choose)}
          </div>
        )}
      </>
    );
  } else if (step.state === "not_needed") {
    body = (
      <>
        <h2 className={nowHeading}>{t.notNeeded(step.person)}</h2>
        {step.noAgreementReason && (
          <p className={nowSecondary}>{step.noAgreementReason}</p>
        )}
      </>
    );
  } else if (step.state === "unmapped") {
    const key = step.key;
    body = !step.canAct ? (
      wait(t.todos.plan)
    ) : (
      <>
        <h2 className={nowHeading}>{t.plan(step.person)}</h2>
        <p className={nowSecondary}>
          {step.template ? t.planWith(step.template) : t.noTemplate}
        </p>
        {step.template ? (
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-48">
              <Field
                name="participation-fee"
                label={t.fee}
                hint={t.feeHint}
                inputMode="decimal"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
              />
            </div>
            <Button
              disabled={plan.pending}
              aria-busy={plan.pending || undefined}
              onClick={() =>
                plan.run(() => saveAgreementFee(step.projectId, key, fee))
              }
            >
              {t.validate}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {open(step.hrefs.plan, t.choose)}
          </div>
        )}
      </>
    );
  } else if (step.state === "needs_info") {
    body = !step.canAct ? (
      wait(t.todos.info)
    ) : (
      <>
        <h2 className={nowHeading}>{t.info(step.person)}</h2>
        {step.missing.length > 0 && (
          <p className={nowSecondary}>{t.missing(step.missing.join(", "))}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {open(step.hrefs.fiche, t.fiche)}
        </div>
      </>
    );
  } else if (step.state === "ready_to_generate") {
    const needId = step.needId;
    body = step.awaiting ? (
      <p className={nowSecondary}>{t.awaiting(step.awaiting.join(", "))}</p>
    ) : !step.canAct || !needId ? (
      wait(t.todos.generate)
    ) : (
      <>
        <h2 className={nowHeading}>{t.generate}</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={generate.pending}
            aria-busy={generate.pending || undefined}
            onClick={() =>
              generate.run(() => generateLegalContract(step.projectId, needId))
            }
          >
            {t.generate}
          </Button>
        </div>
      </>
    );
  } else {
    // Generated: its circuit is the contract's, in its démarche.
    body = (
      <div className="flex flex-wrap gap-2">
        {open(step.hrefs.demarche, t.demarche)}
      </div>
    );
  }

  return (
    <>
      {body}
      {error && <FormMessage kind="error">{error}</FormMessage>}
    </>
  );
}
