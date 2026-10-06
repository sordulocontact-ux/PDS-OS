import { IconFolderOpen, IconPhone } from "nucleo-sharp-essential";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { AllCallsTable } from "@/components/calls/all-calls-table";
import { NewMeetingButton } from "@/components/calls/new-meeting-button";
import { EmptyState } from "@/components/shell/empty-state";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { buttonVariants } from "@/components/ui/button";
import { DataTableViews } from "@/components/ui/data-table";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import {
  asCallView,
  callViewOf,
  CALL_VIEWS,
  nextRoundHourInput,
} from "@/lib/calls/format";
import { listAllCalls, type CallListItem } from "@/lib/calls/queries";
import { loadMembers } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import { viewHref } from "@/lib/ui/view-href";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: `${fr.calls.all.title} · ${fr.app.name}` };

async function loadCalls(): Promise<CallListItem[] | null> {
  try {
    return await listAllCalls(await createClient());
  } catch (error) {
    // Next's own signals (dynamic rendering, redirects) are not failures.
    unstable_rethrow(error);
    console.error(error);
    return null;
  }
}

export default async function CallsPage({
  searchParams,
}: PageProps<"/app/calls">) {
  const [access, calls, params] = await allInOrder([
    requireApproved(),
    loadCalls(),
    searchParams,
  ]);
  const t = fr.calls.all;
  const view = asCallView(params.view);
  const now = new Date();
  const members = (await loadMembers(access)).filter(
    (member) => member.personId !== access.personId,
  );
  const header = (
    <PageHeader
      title={t.title}
      description={t.description}
      action={
        <NewMeetingButton
          members={members}
          defaultOccurredAt={nextRoundHourInput(now)}
        />
      }
    />
  );

  if (!calls) {
    return (
      <PageContainer>
        {header}
        <FormMessage kind="error">{t.loadError}</FormMessage>
      </PageContainer>
    );
  }

  const counts = { upcoming: 0, past: 0 };
  for (const call of calls) counts[callViewOf(call, now)] += 1;
  // Planned calls read soonest first; the others, latest first.
  const shown = view
    ? calls.filter((call) => callViewOf(call, now) === view)
    : calls;
  if (view === "upcoming") shown.reverse();

  return (
    <PageContainer>
      {header}
      {calls.length === 0 ? (
        <EmptyState
          icon={IconPhone}
          title={t.emptyTitle}
          body={t.emptyBody}
          action={
            <Link
              href={routes.projects}
              className={buttonVariants({ variant: "outline" })}
            >
              <IconFolderOpen aria-hidden data-icon="inline-start" />
              {t.openProjects}
            </Link>
          }
        />
      ) : (
        <DataTableViews
          label={t.views.label}
          views={[
            {
              href: routes.calls,
              label: t.views.all,
              count: calls.length,
              current: view === null,
            },
            ...CALL_VIEWS.map((value) => ({
              href: viewHref(routes.calls, { view: value }),
              label: t.views[value],
              count: counts[value],
              current: view === value,
            })),
          ]}
        >
          {shown.length === 0 ? (
            <EmptyState
              icon={IconPhone}
              title={
                view === "upcoming" ? t.emptyUpcomingTitle : t.emptyPastTitle
              }
              body={t.emptyViewBody}
            />
          ) : (
            <AllCallsTable calls={shown} now={now} />
          )}
        </DataTableViews>
      )}
    </PageContainer>
  );
}
