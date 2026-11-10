"use client";

import { IconCheck, IconFile } from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/components/ui/toast";

import { FileDropZone } from "@/components/ui/file-drop-zone";
import { uploadCatalogFile } from "@/lib/catalog/upload-file";
import { legalClearance } from "@/lib/i18n/fr/legal-clearance";

const fr = { legalClearance };

/**
 * Where the signed copy or its proof is dropped, inside the borrowing's
 * panel: the file goes to the contract's files, in its category (« Signé »,
 * « Preuve de signature »), as from the contract's page — the person never
 * has to leave the panel (Sacha, 07/10/2026). Already there: said, done.
 */
export function ContractProofSlot({
  organizationId,
  contractId,
  category,
  label,
  hint,
  present,
  invalid = false,
}: {
  organizationId: string;
  contractId: string;
  // « draft »: the contract to send, when it has no text yet (09/11/2026).
  category: "draft" | "signed" | "evidence" | "pds_signed";
  label: string;
  hint: string;
  present: boolean;
  // Asked for and still missing: said in red (the panel's last click).
  invalid?: boolean;
}) {
  const t = fr.legalClearance.stages.sign;
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  if (present)
    return (
      <div className="flex items-center gap-2 rounded-lg border border-[color:var(--tone-success-fg)] bg-card px-4 py-3 text-sm">
        <IconCheck
          aria-hidden
          className="size-4 text-[color:var(--tone-success-fg)]"
        />
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">· {t.deposited}</span>
      </div>
    );

  return (
    <div
      className={
        invalid ? "rounded-lg ring-1 ring-[color:var(--error)]" : undefined
      }
    >
      <FileDropZone
        label={busy ? t.uploading : label}
        hint={hint}
        icon={IconFile}
        disabled={busy}
        onFiles={async ([file]) => {
          setBusy(true);
          const result = await uploadCatalogFile({
            organizationId,
            owner: { kind: "contract", id: contractId },
            category,
            file,
          });
          setBusy(false);
          if (!result.ok) return void toast.error(result.error);
          // The upload refreshes the contract's page only: this one too.
          router.refresh();
        }}
      />
    </div>
  );
}
