"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { uploadCatalogFile } from "@/lib/catalog/upload-file";
import { dealMemos } from "@/lib/i18n/fr/deal-memos";

const t = dealMemos.contract;

/**
 * « Déposer le contrat » from the deal (Sacha 22/11/2026: « je voudrais
 * pouvoir tout faire depuis la page du deal »): the PDF of the long contract
 * — the label's, or the one PDS had drafted — filed as the contract's draft
 * (its files in Contrats, category « draft »), the page then shows it and
 * its next gesture. A new PDF is a new version of it.
 */
export function DealContractDeposit({
  organizationId,
  contractId,
  variant = "default",
  size = "sm",
}: {
  organizationId: string;
  contractId: string;
  variant?: "default" | "outline";
  size?: "sm" | "lg";
}) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <>
      <input
        ref={input}
        type="file"
        accept="application/pdf"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          startTransition(async () => {
            const result = await uploadCatalogFile({
              organizationId,
              owner: { kind: "contract", id: contractId },
              category: "draft",
              file,
            });
            if (!result.ok) return void toast.error(result.error);
            toast.success(t.deposited);
            router.refresh();
          });
        }}
      />
      <Button
        variant={variant}
        size={size}
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={() => input.current?.click()}
      >
        <IconPlus aria-hidden data-icon="inline-start" />
        {pending ? t.depositing : t.deposit}
      </Button>
    </>
  );
}
