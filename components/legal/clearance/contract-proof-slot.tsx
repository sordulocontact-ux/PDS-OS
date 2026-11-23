"use client";

import { IconCheck, IconFile } from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "@/components/ui/toast";

import { Button } from "@/components/ui/button";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { uploadCatalogFile } from "@/lib/catalog/upload-file";
import { latestContractFile } from "@/lib/contracts/proof-file-actions";
import { legalClearance } from "@/lib/i18n/fr/legal-clearance";

const fr = { legalClearance };

/**
 * Where the signed copy or its proof is dropped, inside the borrowing's
 * panel: the file goes to the contract's files, in its category (« Signé »,
 * « Preuve de signature »), as from the contract's page — the person never
 * has to leave the panel (Sacha, 07/10/2026). Already there: said, done,
 * with « Remplacer » when the wrong file was dropped (a new version).
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
  const picker = useRef<HTMLInputElement>(null);
  // Dropped: the file's own name (Sacha 23/11/2026), read once there.
  const [fileName, setFileName] = useState<string | null>(null);
  useEffect(() => {
    if (!present) return;
    let alive = true;
    void latestContractFile({ contractId, category }).then(
      (file) => alive && setFileName(file?.name ?? null),
    );
    return () => {
      alive = false;
    };
  }, [present, contractId, category]);

  // A new version of the file already there (the wrong one was dropped).
  const replace = async (file: File) => {
    setBusy(true);
    const replacesId = (await latestContractFile({ contractId, category }))?.id;
    const result = await uploadCatalogFile({
      organizationId,
      owner: { kind: "contract", id: contractId },
      category,
      file,
      replacesId,
    });
    setBusy(false);
    if (!result.ok) return void toast.error(result.error);
    toast.success(t.replaced);
    setFileName(file.name);
    router.refresh();
  };

  if (present)
    return (
      <div className="flex items-center gap-2 rounded-lg border border-[color:var(--tone-success-fg)] bg-card px-4 py-3 text-sm">
        <IconCheck
          aria-hidden
          className="size-4 text-[color:var(--tone-success-fg)]"
        />
        <span className="min-w-0 truncate font-medium" title={label}>
          {fileName ?? label}
        </span>
        {/* The tick and the frame say it is there (Sacha 23/11/2026: « le
            déposé ne sert à rien »); only the upload in progress is said. */}
        {busy && <span className="text-muted-foreground">· {t.uploading}</span>}
        <input
          ref={picker}
          type="file"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void replace(file);
          }}
        />
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          disabled={busy}
          aria-busy={busy || undefined}
          aria-label={t.replace(label)}
          onClick={() => picker.current?.click()}
        >
          {t.replaceShort}
        </Button>
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
