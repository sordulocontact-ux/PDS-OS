"use client";

import { useRouter } from "next/navigation";

import {
  FileImport,
  FileImportButton,
} from "@/components/catalog/files/file-import";
import { routes } from "@/lib/auth/redirects";
import type { MasterFactAction } from "@/lib/master-workflow/types";
import { fr } from "@/lib/i18n/fr";

/**
 * "Ajouter l'audio" / "Ajouter les pistes" on a row of the État du master:
 * the title's own import (same modal, same rules as its Audio and Fichiers
 * tabs). Recorded, the page refreshes and the row reads its new state.
 */
export function TitleFileButton({
  organizationId,
  action,
  label,
}: {
  organizationId: string;
  action: Extract<MasterFactAction, { kind: "add_audio" | "add_stems" }>;
  // "Ajouter une version" on the Mix step (an audio file at the mix state).
  label?: string;
}) {
  const router = useRouter();
  const t = fr.masterWorkflow.inventory.actions;
  const owner = { kind: "master", id: action.masterId } as const;
  const button =
    action.kind === "add_audio" ? (
      <FileImportButton row label={label ?? t.addAudio} />
    ) : (
      <FileImportButton row label={t.addStems} />
    );
  return action.kind === "add_audio" ? (
    <FileImport
      organizationId={organizationId}
      owner={owner}
      audio={{ defaultState: action.defaultState }}
      onAdded={() => router.refresh()}
    >
      {button}
    </FileImport>
  ) : (
    <FileImport
      organizationId={organizationId}
      owner={owner}
      view="stems"
      basePath={routes.masterFiles(action.masterId)}
      onAdded={() => router.refresh()}
    >
      {button}
    </FileImport>
  );
}
