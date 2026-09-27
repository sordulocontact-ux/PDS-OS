import { notFound } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { SessionsSection } from "@/components/catalog/master-page/sessions-section";
import { TracksSection } from "@/components/catalog/master-page/tracks-section";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { listMasterSessions } from "@/lib/catalog/master/queries";
import { getMaster } from "@/lib/catalog/queries";
import { fr } from "@/lib/i18n/fr";
import { allInOrder } from "@/lib/utils/parallel";

// Sessions & tracks: where and with whom the title was made, and the tracks
// of its multitrack. Everyone reads; manage_catalog writes.
export default async function MasterSessionsPage({
  params,
}: PageProps<"/app/catalog/masters/[masterId]/sessions">) {
  const { masterId } = await params;
  const [access, master, { sessions, tracks, error }] = await allInOrder([
    requireApproved(),
    getMaster(masterId),
    listMasterSessions(masterId),
  ]);
  if (!master) notFound();
  if (error)
    return <FormMessage kind="error">{fr.masterPage.loadError}</FormMessage>;
  const canEdit = can(access, "manage_catalog");

  return (
    <>
      <SessionsSection
        masterId={master.id}
        sessions={sessions}
        canEdit={canEdit}
      />
      <TracksSection
        masterId={master.id}
        tracks={tracks}
        sessions={sessions}
        canEdit={canEdit}
      />
    </>
  );
}
