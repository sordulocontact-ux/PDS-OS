"use client";

import { IconFile } from "nucleo-sharp-essential";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormMessage } from "@/components/auth/form-message";
import { EmptyNote } from "@/components/shell/empty-state";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import type { ProductionFile } from "@/lib/production/files/queries";
import { uploadProductionFile } from "@/lib/production/files/upload";
import { deleteProductionFile } from "@/lib/production/preprod/actions-files";
import type { NetworkOption } from "@/lib/production/sheet";

import { AddEquipmentButton } from "./equipment-actions";
import { RecordMenu } from "@/components/ui/record-menu";

const t = fr.productionPreprod.equipment;

/**
 * « Devis et captures »: documents dropped by the owner are kept as the
 * source (PDF = devis, image = capture). Lines are entered from a document
 * by a person and start « À vérifier »: nothing is read automatically.
 */
export function QuoteFiles({
  organizationId,
  projectId,
  sheetId,
  files,
  linesByFile,
  dates,
  members,
  contacts,
  canOrganize,
}: {
  organizationId: string | null;
  projectId: string;
  sheetId: string;
  files: ProductionFile[];
  // How many lines were entered from each document.
  linesByFile: Record<string, number>;
  // Each document's date, formatted by the server.
  dates: Record<string, string>;
  members: Member[];
  contacts: NetworkOption[];
  canOrganize: boolean;
}) {
  const [uploading, startUpload] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const common = { projectId, sheetId, members, contacts };

  const upload = (picked: File[]) =>
    startUpload(async () => {
      if (!organizationId) return;
      setError(null);
      for (const file of picked) {
        const result = await uploadProductionFile({
          organizationId,
          projectId,
          sheetId,
          kind: file.type.startsWith("image/") ? "capture" : "quote",
          note: "",
          file,
        });
        if (!result.ok) return setError(result.error);
      }
      toast.success(t.uploaded);
    });

  return (
    <div className="flex flex-col gap-3">
      {files.length === 0 ? (
        <EmptyNote>{t.noQuotes}</EmptyNote>
      ) : (
        <ul className="flex flex-col gap-3">
          {files.map((file) => (
            <li key={file.id} className="flex flex-wrap items-center gap-3">
              <IconFile aria-hidden className="size-5 text-muted-foreground" />
              <div className="flex min-w-0 flex-1 flex-col">
                {file.href ? (
                  <a
                    href={file.href}
                    className="truncate text-sm font-medium hover:underline"
                    aria-label={t.download(file.fileName)}
                  >
                    {file.fileName}
                  </a>
                ) : (
                  <span className="truncate text-sm font-medium">
                    {file.fileName}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {[
                    t.quoteKinds[file.kind === "capture" ? "capture" : "quote"],
                    dates[file.id],
                    linesByFile[file.id]
                      ? t.linesFrom(linesByFile[file.id])
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
              {canOrganize && (
                <>
                  <AddEquipmentButton
                    {...common}
                    quote={{ id: file.id, fileName: file.fileName }}
                  />
                  <RecordMenu
                    label={file.fileName}
                    remove={{
                      title: t.deleteFileTitle,
                      body: t.deleteFileBody(file.fileName),
                      done: t.fileDeleted,
                      run: () =>
                        deleteProductionFile({ projectId, fileId: file.id }),
                    }}
                  />
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {canOrganize && (
        <FileDropZone
          label={uploading ? t.uploading : t.dropLabel}
          hint={t.dropHint}
          accept="application/pdf,image/*"
          multiple
          disabled={uploading || !organizationId}
          icon={IconFile}
          onFiles={upload}
        />
      )}
      <FormMessage kind="error">{error}</FormMessage>
    </div>
  );
}
