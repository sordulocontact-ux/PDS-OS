import { IconClipboardCheck } from "nucleo-sharp-essential";

import { FormMessage } from "@/components/auth/form-message";
import { EmptyState } from "@/components/shell/empty-state";
import { GlobalWorkCountReporter } from "@/components/shell/work-count";
import { WorkBrowser } from "@/components/work/work-browser";
import { WorkLead } from "@/components/work/work-lead";
import type { Access } from "@/lib/auth/access";
import { work } from "@/lib/i18n/fr/work";
import { todayInParis } from "@/lib/insights/dates";
import { loadMyJourneyWork } from "@/lib/work/journeys";
import { loadMyWork } from "@/lib/work/queries";
import { leadOf, workRowsOf } from "@/lib/work/rows";

const fr = { work };

// The global Travail's content, streamed behind a Suspense boundary (the
// header shows first): « Maintenant », the most pressing action with its
// why and what follows, then every other one grouped by when. The journeys'
// actions and what comes before or beside them, one list. Reports each
// project's count to the main navigation.
export async function WorkList({ access }: { access: Access }) {
  const t = fr.work;
  const [work, journeys] = await Promise.all([
    loadMyWork(access),
    loadMyJourneyWork(),
  ]);
  const rows = workRowsOf(work, journeys, todayInParis());
  const lead = leadOf(rows);
  // A read that failed is said, never shown as « nothing ».
  const error = work.error
    ? t.loadError
    : journeys.error
      ? t.journeys.partial
      : null;

  return (
    <>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      {rows.length === 0 && !error ? (
        <EmptyState
          icon={IconClipboardCheck}
          title={t.table.emptyTitle}
          body={t.table.emptyBody}
        />
      ) : (
        <>
          <WorkLead row={lead} />
          {rows.length > (lead ? 1 : 0) && (
            <WorkBrowser rows={rows} lead={lead?.key ?? null} />
          )}
        </>
      )}
      <GlobalWorkCountReporter byProject={journeys.byProject} />
    </>
  );
}
