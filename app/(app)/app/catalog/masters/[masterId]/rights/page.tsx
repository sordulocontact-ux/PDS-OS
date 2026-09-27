import { notFound } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { DeclarationsSection } from "@/components/catalog/master-page/declarations-section";
import { RightsSection } from "@/components/catalog/master-page/rights-section";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import {
  getMasterRights,
  listMasterDeclarations,
} from "@/lib/catalog/master/queries";
import { getMaster } from "@/lib/catalog/queries";
import { fr } from "@/lib/i18n/fr";
import { allInOrder } from "@/lib/utils/parallel";

// Rights & declarations: ISWC and ℗ of the master, then its filing with
// each collecting society. Everyone reads; manage_catalog writes.
export default async function MasterRightsPage({
  params,
}: PageProps<"/app/catalog/masters/[masterId]/rights">) {
  const { masterId } = await params;
  const [access, master, rights, { declarations, error }] = await allInOrder([
    requireApproved(),
    getMaster(masterId),
    getMasterRights(masterId),
    listMasterDeclarations(masterId),
  ]);
  if (!master || !rights) notFound();
  const canEdit = can(access, "manage_catalog");

  return (
    <>
      <RightsSection masterId={master.id} rights={rights} canEdit={canEdit} />
      {error ? (
        <FormMessage kind="error">{fr.masterPage.loadError}</FormMessage>
      ) : (
        <DeclarationsSection
          masterId={master.id}
          declarations={declarations}
          canEdit={canEdit}
        />
      )}
    </>
  );
}
