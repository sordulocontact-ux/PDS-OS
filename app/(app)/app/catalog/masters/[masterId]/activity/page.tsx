import { IconOrderedList } from "nucleo-sharp-essential";
import { notFound } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { ActivityLog } from "@/components/catalog/activity/activity-log";
import { EmptyState } from "@/components/shell/empty-state";
import { requireApproved } from "@/lib/auth/dal";
import {
  MASTER_ACTIVITY_LIMIT,
  listMasterActivity,
} from "@/lib/catalog/master/activity";
import { getMaster } from "@/lib/catalog/queries";
import { fr } from "@/lib/i18n/fr";
import { allInOrder } from "@/lib/utils/parallel";

// Activity tab: what happened around the master, written by the database
// (triggers), filtered by RLS (splits and contracts: manage_catalog; project
// events: those who see the project).
export default async function MasterActivityPage({
  params,
}: PageProps<"/app/catalog/masters/[masterId]/activity">) {
  const { masterId } = await params;
  const [, master, { entries, error }] = await allInOrder([
    requireApproved(),
    getMaster(masterId),
    listMasterActivity(masterId),
  ]);
  if (!master) notFound();
  const t = fr.artistActivity;

  if (error) return <FormMessage kind="error">{t.loadError}</FormMessage>;
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={IconOrderedList}
        title={t.emptyTitle}
        body={fr.masterPage.activity.emptyBody}
      />
    );
  }
  return (
    <ActivityLog
      entries={entries}
      now={new Date()}
      truncated={entries.length >= MASTER_ACTIVITY_LIMIT}
    />
  );
}
