import { IconLock } from "nucleo-sharp-essential";
import { notFound } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { SplitsSection } from "@/components/catalog/master-page/splits-section";
import { EmptyState } from "@/components/shell/empty-state";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { listMasterSplits } from "@/lib/catalog/master/queries";
import { getMaster } from "@/lib/catalog/queries";
import { fr } from "@/lib/i18n/fr";
import { allInOrder } from "@/lib/utils/parallel";

// Splits of the master and of the publishing. Read and written with
// manage_catalog only (RLS agrees); the tab is hidden from everyone else.
export default async function MasterSplitsPage({
  params,
}: PageProps<"/app/catalog/masters/[masterId]/splits">) {
  const { masterId } = await params;
  const accessPromise = requireApproved();
  const [access, master, { splits, error }] = await allInOrder([
    accessPromise,
    getMaster(masterId),
    accessPromise.then((known) =>
      can(known, "manage_catalog")
        ? listMasterSplits(masterId)
        : { splits: [], error: false },
    ),
  ]);
  if (!master) notFound();
  const t = fr.masterPage;

  if (!can(access, "manage_catalog")) {
    return (
      <EmptyState
        icon={IconLock}
        title={t.tabs.splits}
        body={t.splits.reserved}
      />
    );
  }
  if (error) return <FormMessage kind="error">{t.loadError}</FormMessage>;
  return <SplitsSection masterId={master.id} splits={splits} canEdit />;
}
