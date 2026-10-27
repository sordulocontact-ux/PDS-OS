"use client";

import { IconCheck, IconFile } from "nucleo-sharp-essential";
import { useState } from "react";
import { toast } from "sonner";

import { FileDropZone } from "@/components/ui/file-drop-zone";
import { uploadCatalogFile } from "@/lib/catalog/upload-file";
import { fr } from "@/lib/i18n/fr";

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
  category: "signed" | "evidence";
  label: string;
  hint: string;
  present: boolean;
  // Asked for and still missing: said in red (the panel's last click).
  invalid?: boolean;
}) {
  const t = fr.legalClearance.stages.sign;
  const [busy, setBusy] = useState(false);

  if (present)
    return (
      <div className="flex items-center gap-2 rounded-lg border border-[color:var(--tone-success-fg)] px-4 py-3 text-sm">
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
        }}
      />
    </div>
  );
}
