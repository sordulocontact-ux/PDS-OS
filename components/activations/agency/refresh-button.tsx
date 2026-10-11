"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { FilePickField } from "@/components/ui/file-pick-field";
import { FormDialog } from "@/components/ui/form-dialog";
import { uploadActivationFile } from "@/lib/activations/files/upload";
import { refreshAgencySource } from "@/lib/activations/agency/source-actions";
import type { ActivationScope } from "@/lib/activations/types";
import { fr } from "@/lib/i18n/fr";

import { MappingForm } from "./mapping-form";

const t = fr.activationAgency.sources;

/**
 * « Actualiser » : a Google Sheets source is read at once ; a file source asks
 * for the latest file first. When the columns' correspondence is missing or
 * broken, the code's proposal opens, then the read starts again.
 */
export function RefreshButton({
  scope,
  sourceId,
  kind,
  press,
  mapping,
  keyFields,
}: {
  scope: ActivationScope;
  sourceId: string;
  kind: "google_sheet" | "file";
  press: boolean;
  mapping: Record<string, string>;
  keyFields: string[];
}) {
  const [pending, startTransition] = useTransition();
  const [fileOpen, setFileOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needs, setNeeds] = useState<{
    headers: string[];
    proposal: Record<string, string>;
  } | null>(null);

  const refresh = (id: string | null) =>
    startTransition(async () => {
      const result = await refreshAgencySource({
        projectId: scope.projectId,
        sourceId,
        fileId: id,
      });
      if (!result.ok) {
        if (fileOpen) setError(result.error);
        else toast.error(result.error);
        return;
      }
      setFileOpen(false);
      if (result.needsMapping) setNeeds(result.needsMapping);
      else toast.success(t.analysed);
    });

  const upload = () =>
    startTransition(async () => {
      if (!file) return setError(fr.activationAgency.errors.fileRequired);
      const uploaded = await uploadActivationFile({
        ...scope,
        kind: "agency_source",
        file,
      });
      if (!uploaded.ok) return setError(uploaded.error);
      setFileId(uploaded.fileId);
      refresh(uploaded.fileId);
    });

  return (
    <>
      <Button
        type="button"
        size="xs"
        disabled={pending}
        onClick={() => (kind === "file" ? setFileOpen(true) : refresh(null))}
      >
        {pending ? fr.activations.saving : t.refresh}
      </Button>
      <FormDialog
        open={fileOpen}
        onOpenChange={setFileOpen}
        title={t.refreshTitle}
        description={t.refreshDescription}
        closeLabel={fr.dialogs.close}
      >
        <div className="flex flex-col gap-4">
          <FilePickField
            id={`agency-file-${sourceId}`}
            label={t.file}
            hint={fr.activations.fileHint}
            chosenLabel={fr.activations.fileChosen}
            file={file}
            onFile={setFile}
          />
          {error && <FormMessage kind="error">{error}</FormMessage>}
          <div className="flex justify-end">
            <Button type="button" size="lg" disabled={pending} onClick={upload}>
              {pending ? fr.activations.saving : t.refresh}
            </Button>
          </div>
        </div>
      </FormDialog>
      <FormDialog
        open={needs !== null}
        onOpenChange={(open) => !open && setNeeds(null)}
        title={t.mappingTitle}
        description={t.needsMapping}
        closeLabel={fr.dialogs.close}
        size="wide"
      >
        {needs && (
          <MappingForm
            projectId={scope.projectId}
            sourceId={sourceId}
            press={press}
            headers={needs.headers}
            mapping={{ ...mapping, ...needs.proposal }}
            keyFields={keyFields}
            onCancel={() => setNeeds(null)}
            onSaved={() => {
              setNeeds(null);
              refresh(fileId);
            }}
          />
        )}
      </FormDialog>
    </>
  );
}
