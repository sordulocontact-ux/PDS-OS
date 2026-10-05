import { notFound } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import {
  FileDropArea,
  FileImport,
  FileImportButton,
} from "@/components/catalog/files/file-import";
import { FilesTable } from "@/components/catalog/files/files-table";
import { SessionsSection } from "@/components/catalog/master-page/sessions-section";
import { TracksSection } from "@/components/catalog/master-page/tracks-section";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { listCatalogFiles } from "@/lib/catalog/files";
import { listMasterSessions } from "@/lib/catalog/master/queries";
import { getMaster } from "@/lib/catalog/queries";
import { byAudioProgress } from "@/lib/catalog/title-rules";
import { fr } from "@/lib/i18n/fr";
import { allInOrder } from "@/lib/utils/parallel";

// Audio tab: the song's evolution in one table, each file with the audio
// state it stands for (a column, not a group), most advanced first. Every
// file stays on this same title; adding one at a later state moves the title
// forward (SQL trigger, docs/ARCHITECTURE.md § 2 septies). Then the sessions
// and the tracks of its multitrack (#sessions, #tracks). manage_catalog adds
// (button or drop, the state is asked in the modal) and deletes; everyone
// listens.
export default async function MasterAudioPage({
  params,
}: PageProps<"/app/catalog/masters/[masterId]/audio">) {
  const { masterId } = await params;
  const owner = { kind: "master", id: masterId } as const;
  const [access, master, { files, error }, made] = await allInOrder([
    requireApproved(),
    getMaster(masterId),
    listCatalogFiles(owner, "audio"),
    listMasterSessions(masterId),
  ]);
  if (!master) notFound();
  const organizationId = can(access, "manage_catalog")
    ? access.organizationId
    : null;
  const t = fr.masterPage.audio;

  const evolution = (
    <PageSection
      card
      id="audio"
      title={t.title}
      description={t.description}
      action={organizationId && <FileImportButton label={t.add} compact />}
    >
      {error ? (
        <FormMessage kind="error">{fr.catalogFiles.loadError}</FormMessage>
      ) : files.length === 0 ? (
        <EmptyNote>
          {organizationId ? t.emptyBody : t.emptyBodyReadOnly}
        </EmptyNote>
      ) : (
        <FilesTable
          owner={owner}
          files={byAudioProgress(files)}
          canEdit={!!organizationId}
          audio
        />
      )}
    </PageSection>
  );

  return (
    <>
      {organizationId ? (
        <FileImport
          organizationId={organizationId}
          owner={owner}
          audio={{ defaultState: master.audioState ?? "demo" }}
        >
          <FileDropArea>{evolution}</FileDropArea>
        </FileImport>
      ) : (
        evolution
      )}
      {made.error ? (
        <FormMessage kind="error">{fr.masterPage.loadError}</FormMessage>
      ) : (
        <>
          <SessionsSection
            masterId={master.id}
            sessions={made.sessions}
            canEdit={!!organizationId}
          />
          <TracksSection
            masterId={master.id}
            tracks={made.tracks}
            sessions={made.sessions}
            canEdit={!!organizationId}
          />
        </>
      )}
    </>
  );
}
