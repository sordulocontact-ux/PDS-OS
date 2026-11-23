"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { uploadCatalogFile } from "@/lib/catalog/upload-file";
import { saveContract } from "@/lib/contracts/actions";
import type { ContractType } from "@/lib/contracts/types";
import { linkDealContract } from "@/lib/deals/memo-actions";
import { dealMemos } from "@/lib/i18n/fr/deal-memos";

const t = dealMemos.contract;

/** What the new contract already knows from the deal. */
export type DealContractDefaults = {
  title: string;
  type: ContractType;
  artistId: string | null;
  projectId: string | null;
  // Its folder in the contracts' bucket.
  organizationId: string | null;
};

/**
 * « Importer un contrat » (Sacha 23/11/2026: « ça nous crée juste un
 * contrat sans déposer le contrat »): the label's PDF is picked at once; the
 * contract is created from the deal (its name, a licence or a partnership,
 * its artist and project), linked to the deal, and the PDF is its draft
 * (category « draft »), ready to be sent to validate. For whoever creates
 * contracts (manage_contracts).
 */
export function DealContractCreate({
  dealId,
  defaults,
  variant = "outline",
  size = "sm",
  label = t.import,
}: {
  dealId: string;
  defaults: DealContractDefaults;
  // `default`/`lg`: the main gesture of « Maintenant ».
  variant?: "default" | "outline";
  size?: "lg" | "sm";
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const importPdf = (file: File) =>
    startTransition(async () => {
      if (!defaults.organizationId) return void toast.error(t.importFailed);
      const form = new FormData();
      form.set("title", defaults.title);
      form.set("type", defaults.type);
      form.set("artistId", defaults.artistId ?? "");
      form.set("projectId", defaults.projectId ?? "");
      form.set("stay", "1");
      const created = await saveContract(null, form);
      if (!created.ok) return void toast.error(created.error);
      const linked = await linkDealContract(dealId, created.id);
      if (!linked.ok) return void toast.error(linked.error);
      const filed = await uploadCatalogFile({
        organizationId: defaults.organizationId,
        owner: { kind: "contract", id: created.id },
        category: "draft",
        file,
      });
      // Created and linked: its page in Contrats takes the PDF again.
      if (!filed.ok) toast.error(filed.error);
      else toast.success(t.imported);
      router.refresh();
    });

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
          if (file) importPdf(file);
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
        {pending ? t.importing : label}
      </Button>
    </>
  );
}
