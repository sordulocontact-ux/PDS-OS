"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { uploadCatalogFile } from "@/lib/catalog/upload-file";
import { contracts } from "@/lib/i18n/fr/contracts";

const t = contracts.deposit;

/**
 * « Déposer le contrat » (Sacha 22/11/2026): a contract made outside a
 * template has no document until its PDF is filed — the label's long
 * contract, or the one a lawyer drafted —, as its draft (its files,
 * category « draft »); only then is it sent to validate. The same button on
 * its page in Contrats and on its deal's page (« Maintenant », « Contrat »).
 */
export function ContractDepositButton({
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
