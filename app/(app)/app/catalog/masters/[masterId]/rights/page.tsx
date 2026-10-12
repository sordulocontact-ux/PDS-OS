import { notFound } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { DeclarationsSection } from "@/components/catalog/master-page/declarations-section";
import { RightsSection } from "@/components/catalog/master-page/rights-section";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import {
  getMasterRights,
  listDeclarationEvents,
  listMasterDeclarations,
} from "@/lib/catalog/master/queries";
import { getMaster } from "@/lib/catalog/queries";
import { suggestRightsHolder } from "@/lib/catalog/master/rights-holder-actions";
import { fr } from "@/lib/i18n/fr";
import { allInOrder } from "@/lib/utils/parallel";

// Rights & declarations: ISWC and ℗ of the master, then its filing with
// each collecting society. Everyone reads; manage_catalog writes.
export default async function MasterRightsPage({
  params,
}: PageProps<"/app/catalog/masters/[masterId]/rights">) {
  const { masterId } = await params;
  const [access, master, rights, { declarations, error }, history] =
    await allInOrder([
      requireApproved(),
      getMaster(masterId),
      getMasterRights(masterId),
      listMasterDeclarations(masterId),
      listDeclarationEvents(masterId),
    ]);
  if (!master || !rights) notFound();
  const canEdit = can(access, "manage_catalog");
  // Who the master split proposes today: a confirmed holder that differs is
  // to review (retour 58). Splits are read by manage_catalog only.
  const suggested = canEdit ? await suggestRightsHolder(master.id) : null;

  return (
    <>
      <RightsSection
        masterId={master.id}
        rights={rights}
        suggested={suggested?.name ?? null}
        canEdit={canEdit}
      />
      {error ? (
        <FormMessage kind="error">{fr.masterPage.loadError}</FormMessage>
      ) : (
        <DeclarationsSection
          masterId={master.id}
          declarations={declarations}
          history={history}
          canEdit={canEdit}
        />
      )}
    </>
  );
}
