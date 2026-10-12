import { notFound } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import {
  FileDropArea,
  FileImport,
  FileImportButton,
} from "@/components/catalog/files/file-import";
import { AudioSummary } from "@/components/catalog/master-page/audio/audio-summary";
import { AudioVersionList } from "@/components/catalog/master-page/audio/audio-version-list";
import { SessionsSection } from "@/components/catalog/master-page/sessions-section";
import { TracksSection } from "@/components/catalog/master-page/tracks-section";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import {
  audioOverview,
  numberAudioVersions,
} from "@/lib/catalog/audio-versions";
import { listAudioVersions } from "@/lib/catalog/master/audio";
import { listMasterSessions } from "@/lib/catalog/master/queries";
import { getMaster } from "@/lib/catalog/queries";
import { fr } from "@/lib/i18n/fr";
import { allInOrder } from "@/lib/utils/parallel";

// Audio tab (retours Catalogue 10, 13, 18 à 26): the step reached, the last
// version deposited and the last validated, then every version numbered in
// its step (Mix V2), with its validation, its player and its comments.
// Adding one at a later step moves the title forward (SQL trigger), never
// validates it: manage_catalog validates or asks for corrections, on that
// exact file (docs/ARCHITECTURE.md § 2 septies). Then the sessions and the
// tracks of its multitrack (#sessions, #tracks). Everyone listens and
// comments.
export default async function MasterAudioPage({
  params,
}: PageProps<"/app/catalog/masters/[masterId]/audio">) {
  const { masterId } = await params;
  const owner = { kind: "master", id: masterId } as const;
  const [access, master, { versions: raw, error }, made] = await allInOrder([
    requireApproved(),
    getMaster(masterId),
    listAudioVersions(masterId),
    listMasterSessions(masterId),
  ]);
  if (!master) notFound();
  const organizationId = can(access, "manage_catalog")
    ? access.organizationId
    : null;
  const t = fr.masterPage.audio;
  const versions = numberAudioVersions(raw);

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
      ) : versions.length === 0 ? (
        <EmptyNote>
          {organizationId ? t.emptyBody : t.emptyBodyReadOnly}
        </EmptyNote>
      ) : (
        <div className="flex flex-col gap-6">
          <AudioSummary
            state={master.audioState}
            finalValidated={master.finalValidatedAt !== null}
            overview={audioOverview(versions)}
          />
          <AudioVersionList
            masterId={master.id}
            versions={versions}
            canEdit={!!organizationId}
          />
        </div>
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
