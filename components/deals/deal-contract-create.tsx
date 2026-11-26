"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ContractImport } from "@/components/contracts/contract-import";
import { LoadedFormButton } from "@/components/ui/loaded-form-button";
import { toast } from "@/components/ui/toast";
import { uploadCatalogFile } from "@/lib/catalog/upload-file";
import { loadContractOptions } from "@/lib/contracts/actions";
import type { ContractType } from "@/lib/contracts/types";
import { linkDealContract } from "@/lib/deals/memo-actions";
import { dealMemos } from "@/lib/i18n/fr/deal-memos";
import { dialogs } from "@/lib/i18n/fr/dialogs";

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
 * « Importer un contrat » (Sacha 23/11/2026: « importer des docs »): the same
 * screen as « Déposer un contrat » of Contrats (Sacha 26/11/2026): the
 * label's document first (PDF or Word), then the contract beside its form,
 * filled from the deal (its name, a licence or a partnership, its artist and
 * project) and from the document for what the deal does not say. Saved: the
 * contract is the deal's at once and the document its draft (category
 * « draft »), ready to be sent to validate. For whoever creates contracts.
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
  const router = useRouter();
  // The document read: the modal widens for it.
  const [dropped, setDropped] = useState(false);
  const filed = async (id: string, file: File | null) => {
    const linked = await linkDealContract(dealId, id);
    if (!linked.ok) return void toast.error(linked.error);
    if (file && defaults.organizationId) {
      const upload = await uploadCatalogFile({
        organizationId: defaults.organizationId,
        owner: { kind: "contract", id },
        category: "draft",
        file,
      });
      // Created and linked: its page in Contrats takes the document again.
      if (!upload.ok) toast.error(upload.error);
      else toast.success(t.imported);
    }
    router.refresh();
  };
  return (
    <LoadedFormButton
      label={label}
      icon={IconPlus}
      variant={variant}
      size={size}
      dialogSize={dropped ? "document" : "default"}
      title={t.importTitle}
      description={t.importDescription}
      closeLabel={dialogs.close}
      load={loadContractOptions}
    >
      {(options, close) => (
        <DealContractImport
          onGone={() => setDropped(false)}
          options={options}
          known={{
            title: defaults.title,
            type: defaults.type,
            artistId: defaults.artistId,
            projectId: defaults.projectId,
          }}
          onDropped={() => setDropped(true)}
          onCancel={close}
          onClose={close}
          onSaved={(id, file) => {
            close();
            void filed(id, file);
          }}
        />
      )}
    </LoadedFormButton>
  );
}

/** The import, which gives the modal its usual width back once closed (the
 * ✕ included). */
function DealContractImport({
  onGone,
  ...props
}: React.ComponentProps<typeof ContractImport> & { onGone: () => void }) {
  // Only once it goes: the parent's callback changes with every render.
  const gone = useRef(onGone);
  useEffect(() => {
    gone.current = onGone;
  });
  useEffect(() => () => gone.current(), []);
  return <ContractImport {...props} />;
}
