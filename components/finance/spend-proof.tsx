"use client";

import { IconPaperclip } from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  FINANCE_FILE_ACCEPT,
  FINANCE_FILE_TYPES,
} from "@/lib/finance/file-rules";
import { addProof } from "@/lib/finance/proof-actions";
import {
  attachProof,
  checkProof,
  dismissProof,
} from "@/lib/finance/proof-gestures";
import { spendDay, spendTtc, type FinanceSpend } from "@/lib/finance/spends";
import { uploadFinanceFile } from "@/lib/finance/upload-file";
import { financeSheet } from "@/lib/i18n/fr/finance-home";
import { amountInput } from "@/lib/utils/money";

const t = financeSheet.spend;
const MAX_BYTES = 20 * 1024 * 1024;

type Step =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "proposed"; proofId: string; name: string };

/**
 * « Joindre le justificatif » inside a spend's sheet (Sacha 15/11/2026: a
 * proof is only a document, never leave the sheet for it): the file is
 * picked, kept in Finance › Justificatifs as any proof, then proposed for
 * this spend; « Rattacher » attaches it (attach_finance_proof), the person
 * vouching for the spend's own amount and day, so no reading is waited
 * for. « Retirer » sets it aside. Any spend, a project's or an artist's too.
 */
export function SpendProof({
  spend,
  organizationId,
}: {
  spend: FinanceSpend;
  organizationId: string;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>({ kind: "idle" });

  async function upload(file: File | undefined) {
    if (!file) return;
    if (!FINANCE_FILE_TYPES[file.type] || file.size > MAX_BYTES) {
      toast.error(t.proofType, { description: file.name });
      return;
    }
    setStep({ kind: "busy" });
    const stored = await uploadFinanceFile(organizationId, file);
    const proof = stored.ok
      ? await addProof({
          path: stored.path,
          name: stored.name,
          mime: file.type,
        })
      : stored;
    if (!proof.ok) {
      toast.error(t.proofFailed, { description: file.name });
      setStep({ kind: "idle" });
      return;
    }
    setStep({ kind: "proposed", proofId: proof.id, name: file.name });
  }

  async function attach(proofId: string) {
    setStep({ kind: "busy" });
    const checked = await checkProof({
      id: proofId,
      vendor: spend.supplier ?? "",
      amount: amountInput(spendTtc(spend)),
      vat: "",
      issuedOn: spendDay(spend),
      reference: "",
    });
    const done = checked.ok ? await attachProof(proofId, spend.id) : checked;
    if (!done.ok) {
      toast.error(done.error);
      setStep({ kind: "idle" });
      return;
    }
    toast.success(t.proofAttached);
    router.refresh();
  }

  async function remove(proofId: string) {
    setStep({ kind: "busy" });
    await dismissProof(proofId, t.proofRemoved);
    setStep({ kind: "idle" });
  }

  if (step.kind === "proposed")
    return (
      <span className="flex w-full flex-col gap-2 rounded-[var(--radius-lg)] border border-[color:var(--selection)] p-3">
        <span className="flex items-center gap-2">
          <IconPaperclip aria-hidden className="size-4 shrink-0" />
          <span className="min-w-0 truncate">{step.name}</span>
        </span>
        <span className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => attach(step.proofId)}>
            {t.attachHere}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => remove(step.proofId)}
          >
            {t.removeProof}
          </Button>
        </span>
      </span>
    );

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={step.kind === "busy"}
        onClick={() => input.current?.click()}
      >
        <IconPaperclip aria-hidden data-icon="inline-start" />
        {step.kind === "busy" ? t.proofSending : t.attachProof}
      </Button>
      <input
        ref={input}
        type="file"
        accept={FINANCE_FILE_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          void upload(file);
        }}
      />
    </>
  );
}
