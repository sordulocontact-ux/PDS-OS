"use client";

import { IconFile } from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ContractForm } from "@/components/contracts/contract-form";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { toast } from "@/components/ui/toast";
import { routes } from "@/lib/auth/redirects";
import { uploadCatalogFile } from "@/lib/catalog/upload-file";
import {
  CONTRACT_FILE_ACCEPT,
  contractPrefill,
  type ContractPrefill,
} from "@/lib/contracts/import-prefill";
import type { ContractFormOptions } from "@/lib/contracts/types";
import { contracts } from "@/lib/i18n/fr/contracts";

const fr = { contracts };

/** The text of the dropped file, read on the server; null when unreadable. */
async function readText(file: File): Promise<string | null> {
  const body = new FormData();
  body.append("file", file);
  try {
    const response = await fetch("/api/contracts/import-text", {
      method: "POST",
      body,
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { text?: string | null };
    return json.text ?? null;
  } catch {
    return null;
  }
}

/**
 * « Déposer un contrat existant » (Sacha 26/11/2026): the file first, then
 * the contract form filled from it (its title, kind, artist and project,
 * read by code), each value corrigible. Saved: the file is filed as its
 * draft and its page opens, where its parties are added.
 */
export function ContractImport({
  options,
  projectId,
  onDropped,
  onCancel,
  onClose,
}: {
  options: ContractFormOptions;
  projectId?: string;
  // The file is read: the form follows.
  onDropped?: () => void;
  onCancel: () => void;
  onClose: () => void;
}) {
  const t = fr.contracts.creation;
  const router = useRouter();
  const [reading, setReading] = useState(false);
  const [dropped, setDropped] = useState<{
    file: File;
    prefill: ContractPrefill;
  } | null>(null);

  const drop = async ([file]: File[]) => {
    if (!file) return;
    setReading(true);
    const text = await readText(file);
    setDropped({ file, prefill: contractPrefill(text, file.name, options) });
    setReading(false);
    onDropped?.();
  };

  const saved = async (id: string, file: File | null) => {
    if (file && options.organizationId) {
      const upload = await uploadCatalogFile({
        organizationId: options.organizationId,
        owner: { kind: "contract", id },
        category: "draft",
        file,
      });
      // Created: its page takes the file again.
      if (!upload.ok) toast.error(upload.error);
      else toast.success(t.imported);
    }
    onClose();
    router.push(routes.contract(id));
  };

  if (!dropped)
    return (
      <FileDropZone
        label={reading ? t.reading : t.drop}
        hint={t.dropHint}
        accept={CONTRACT_FILE_ACCEPT}
        icon={IconFile}
        disabled={reading}
        onFiles={(files) => void drop(files)}
      />
    );

  const { file, prefill } = dropped;
  return (
    <ContractForm
      options={options}
      stay
      document={{
        label: t.document,
        hint: t.documentHint,
        accept: CONTRACT_FILE_ACCEPT,
        file,
      }}
      initial={{
        title: prefill.title,
        type: prefill.type,
        artistId: prefill.artistId,
        projectId: projectId ?? prefill.projectId,
      }}
      onCancel={onCancel}
      onSaved={(id, chosen) => void saved(id, chosen)}
    />
  );
}
