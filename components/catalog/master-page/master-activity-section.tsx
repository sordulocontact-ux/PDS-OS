import { FormMessage } from "@/components/auth/form-message";
import {
  ActivityLog,
  type ActivityEntry,
} from "@/components/catalog/activity/activity-log";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { MASTER_ACTIVITY_LIMIT } from "@/lib/catalog/master/activity";
import { artistActivity } from "@/lib/i18n/fr/artist-activity";
import { masterPage } from "@/lib/i18n/fr/master-page";

const fr = { artistActivity, masterPage };

// Activity block, last of the title overview: what happened around the
// title, written by the database (triggers), filtered by RLS.
export function MasterActivitySection({
  entries,
  error,
}: {
  entries: ActivityEntry[];
  error: boolean;
}) {
  return (
    <PageSection card id="activity" title={fr.artistActivity.title}>
      {error ? (
        <FormMessage kind="error">{fr.artistActivity.loadError}</FormMessage>
      ) : entries.length === 0 ? (
        <EmptyNote>{fr.masterPage.activity.emptyBody}</EmptyNote>
      ) : (
        <ActivityLog
          entries={entries}
          now={new Date()}
          truncated={entries.length >= MASTER_ACTIVITY_LIMIT}
        />
      )}
    </PageSection>
  );
}
