import { IconVolumeUp } from "nucleo-sharp-essential";
import { notFound } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { FileUpload } from "@/components/catalog/files/file-upload";
import { FilesTable } from "@/components/catalog/files/files-table";
import { EmptyNote, EmptyState } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { StatusBadge } from "@/components/ui/status-badge";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { listCatalogFiles } from "@/lib/catalog/files";
import { getMaster } from "@/lib/catalog/queries";
import { AUDIO_STATES } from "@/lib/catalog/title-rules";
import { fr } from "@/lib/i18n/fr";
import { audioStateTone } from "@/lib/ui/state-tones";
import { allInOrder } from "@/lib/utils/parallel";

// Audio tab: the song's evolution, one block per audio state from the demo
// to the final master, each with its files (newest first). Every file stays
// on this same title; adding one at a later state moves the title forward
// (SQL trigger, docs/ARCHITECTURE.md § 2 septies). manage_catalog adds and
// deletes; everyone listens.
export default async function MasterAudioPage({
  params,
}: PageProps<"/app/catalog/masters/[masterId]/audio">) {
  const { masterId } = await params;
  const owner = { kind: "master", id: masterId } as const;
  const [access, master, { files, error }] = await allInOrder([
    requireApproved(),
    getMaster(masterId),
    listCatalogFiles(owner, "audio"),
  ]);
  if (!master) notFound();
  const organizationId = can(access, "manage_catalog")
    ? access.organizationId
    : null;
  const t = fr.masterPage.audio;

  return (
    <div className="flex flex-col gap-[var(--section-gap)]">
      {organizationId && (
        <FileUpload
          organizationId={organizationId}
          owner={owner}
          audio={{ defaultState: master.audioState ?? "demo" }}
        />
      )}
      {error ? (
        <FormMessage kind="error">{fr.catalogFiles.loadError}</FormMessage>
      ) : files.length === 0 ? (
        <EmptyState
          icon={IconVolumeUp}
          title={t.emptyTitle}
          body={organizationId ? t.emptyBody : t.emptyBodyReadOnly}
        />
      ) : (
        AUDIO_STATES.map((state) => {
          const own = files.filter((file) => file.audioState === state);
          return (
            <PageSection
              key={state}
              id={`audio-${state}`}
              title={fr.catalog.audioStates[state]}
              action={
                master.audioState === state && (
                  <StatusBadge tone={audioStateTone[state]} size="sm">
                    {t.current}
                  </StatusBadge>
                )
              }
            >
              {own.length > 0 ? (
                <FilesTable
                  owner={owner}
                  files={own}
                  canDelete={!!organizationId}
                  audio
                />
              ) : (
                <EmptyNote>{t.none}</EmptyNote>
              )}
            </PageSection>
          );
        })
      )}
    </div>
  );
}
