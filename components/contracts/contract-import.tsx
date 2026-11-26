"use client";

import { IconFile } from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ContractFilePreview } from "@/components/contracts/contract-file-preview";
import { ContractForm } from "@/components/contracts/contract-form";
import { fileImportedContract } from "@/components/contracts/file-imported-contract";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { toast } from "@/components/ui/toast";
import { routes } from "@/lib/auth/redirects";
import {
  CONTRACT_FILE_ACCEPT,
  contractPrefill,
  type ContractPrefill,
} from "@/lib/contracts/import-prefill";
import type { ContractFormOptions, ContractType } from "@/lib/contracts/types";
import { contracts } from "@/lib/i18n/fr/contracts";
import {
  isDocumentFont,
  type DocumentFont,
} from "@/lib/legal/contracts/document-fonts";

const fr = { contracts };

type Read = { text: string | null; font: DocumentFont | null };

/** The text of the dropped file and its typeface, read on the server; no
 * text when unreadable. */
async function readFile(file: File): Promise<Read> {
  const body = new FormData();
  body.append("file", file);
  try {
    const response = await fetch("/api/contracts/import-text", {
      method: "POST",
      body,
    });
    if (!response.ok) return { text: null, font: null };
    const json = (await response.json()) as {
      text?: string | null;
      font?: unknown;
    };
    return {
      text: json.text ?? null,
      font: isDocumentFont(json.font) ? json.font : null,
    };
  } catch {
    return { text: null, font: null };
  }
}

/**
 * « Déposer un contrat existant » (Sacha 26/11/2026): the file first, then
 * the contract beside its form (« mettre le contrat à côté de toutes les
 * infos pour le voir »), the form filled from it (its title, kind, artist
 * and project, read by code), each value checked against the document and
 * corrigible. Saved: the file is filed as its draft and its page opens,
 * where its parties are added.
 */
export function ContractImport({
  options,
  projectId,
  known,
  onSaved,
  onDropped,
  onCancel,
  onClose,
}: {
  options: ContractFormOptions;
  projectId?: string;
  // What the caller already knows (« Importer un contrat » of a deal): its
  // type, artist and project win over the file's; its title only over the
  // file's name, never over the document's own title line.
  known?: {
    title: string;
    type: ContractType;
    artistId: string | null;
    projectId: string | null;
  };
  // Saved elsewhere than Contrats (a deal links it and stays on its page);
  // by default the file is filed (fileImportedContract) and its page opens.
  onSaved?: (id: string, file: File | null, signedOn: string | null) => void;
  // The file is read: the document and its form follow.
  onDropped?: () => void;
  onCancel: () => void;
  onClose: () => void;
}) {
  const t = fr.contracts.creation;
  const router = useRouter();
  const [reading, setReading] = useState(false);
  const [dropped, setDropped] = useState<
    (Read & { file: File; prefill: ContractPrefill }) | null
  >(null);

  const drop = async (file: File | undefined) => {
    if (!file) return;
    setReading(true);
    const read = await readFile(file);
    setDropped({
      ...read,
      file,
      prefill: contractPrefill(read.text, file.name, options),
    });
    setReading(false);
    onDropped?.();
  };

  const saved = async (
    id: string,
    file: File | null,
    signedOn: string | null,
  ) => {
    if (file && options.organizationId) {
      const error = await fileImportedContract({
        organizationId: options.organizationId,
        contractId: id,
        file,
        signedOn,
      });
      // Created: its page takes the file again, or is signed there.
      if (error) toast.error(error);
      else toast.success(signedOn ? t.importedSigned : t.imported);
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
        onFiles={([file]) => void drop(file)}
      />
    );

  const { file, prefill } = dropped;
  return (
    // The form first on a phone, the document under it; side by side on a
    // wide screen, the document as tall as the modal allows.
    <div className="flex flex-col gap-6 lg:h-[calc(100dvh-8.5rem)] lg:flex-row-reverse">
      <div className="flex flex-col lg:w-[22rem] lg:shrink-0 lg:overflow-y-auto">
        <ContractForm
          // Another file: its own values, the form filled again.
          key={`${file.name}-${file.lastModified}-${file.size}`}
          options={options}
          stay
          existing
          document={{
            label: t.document,
            hint: t.documentHint,
            accept: CONTRACT_FILE_ACCEPT,
            file,
            onFile: (chosen) => void drop(chosen),
          }}
          initial={{
            title:
              known && !prefill.titleFromText ? known.title : prefill.title,
            type: known?.type ?? prefill.type,
            // What the deal says wins; the file fills what it does not.
            artistId: known?.artistId ?? prefill.artistId,
            projectId: projectId ?? known?.projectId ?? prefill.projectId,
            startsOn: prefill.startsOn,
            endsOn: prefill.endsOn,
          }}
          // The dates the document states (import-dates.ts), corrigible.
          signedOn={prefill.signedOn}
          onCancel={onCancel}
          onSaved={(id, chosen, signedOn) =>
            onSaved
              ? onSaved(id, chosen, signedOn)
              : void saved(id, chosen, signedOn)
          }
        />
      </div>
      <ContractFilePreview
        file={file}
        text={dropped.text}
        font={dropped.font}
      />
    </div>
  );
}
