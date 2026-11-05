import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  sessionHours,
  sessionName,
} from "@/components/sessions/sessions-table";
import { LinksSection } from "@/components/sessions/session-page/links-section";
import { ReportSection } from "@/components/sessions/session-page/report-section";
import { SessionHeaderActions } from "@/components/sessions/session-page/session-header-actions";
import { TitlesSection } from "@/components/sessions/session-page/titles-section";
import { BackLink } from "@/components/shell/back-link";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { PageSection } from "@/components/shell/page-section";
import { FactList } from "@/components/ui/fact-list";
import { StatusBadge } from "@/components/ui/status-badge";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { formatDay } from "@/lib/utils/day";
import { getStudioSession } from "@/lib/sessions/queries";
import type { SessionRef } from "@/lib/sessions/types";
import { sessionStatusTone } from "@/lib/ui/state-tones";
import { allInOrder } from "@/lib/utils/parallel";

export async function generateMetadata({
  params,
}: PageProps<"/app/sessions/[sessionId]">): Promise<Metadata> {
  const { sessionId } = await params;
  const session = await getStudioSession(sessionId).catch(() => null);
  return session ? { title: `${sessionName(session)} · ${fr.app.name}` } : {};
}

const linkClass = "underline-offset-4 hover:underline";

function Refs({
  refs,
  href,
}: {
  refs: SessionRef[];
  href: (id: string) => string;
}) {
  if (refs.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1">
      {refs.map((ref) => (
        <Link key={ref.id} href={href(ref.id)} className={linkClass}>
          {ref.name}
        </Link>
      ))}
    </span>
  );
}

// A studio session (retour d'Ibé du 01/11/2026): its report first (the
// gesture of its responsible, after the session), the maquettes and titles
// worked on, the rushes' links, then its facts.
export default async function SessionPage({
  params,
}: PageProps<"/app/sessions/[sessionId]">) {
  const { sessionId } = await params;
  const [access, session] = await allInOrder([
    requireApproved(),
    getStudioSession(sessionId),
  ]);
  if (!session) notFound();
  const t = fr.sessions;
  const canEdit = can(access, "manage_sessions");
  const hours = sessionHours(session);

  return (
    <PageContainer className="max-w-5xl">
      <BackLink href={routes.sessions}>{t.page.back}</BackLink>
      <PageHeader
        title={sessionName(session)}
        badge={
          <StatusBadge tone={sessionStatusTone[session.status]}>
            {fr.masterPage.sessions.statuses[session.status]}
          </StatusBadge>
        }
        description={[session.date ? formatDay(session.date) : t.noDate, hours]
          .filter(Boolean)
          .join(" · ")}
        action={canEdit ? <SessionHeaderActions session={session} /> : null}
      />
      <div className="flex flex-col gap-[var(--section-gap)]">
        <ReportSection
          session={session}
          viewerPersonId={access.personId}
          canEdit={canEdit}
        />
        <TitlesSection session={session} canEdit={canEdit} />
        <LinksSection
          sessionId={session.id}
          links={session.links}
          canEdit={canEdit}
        />
        <PageSection card id="informations" title={t.page.infoTitle}>
          <FactList
            emptyLabel={t.page.none}
            facts={[
              {
                label: t.page.facts.artists,
                value: <Refs refs={session.artists} href={routes.artist} />,
              },
              {
                label: t.page.facts.projects,
                value: <Refs refs={session.projects} href={routes.project} />,
              },
              { label: t.page.facts.studio, value: session.studio },
              { label: t.page.facts.engineer, value: session.engineer },
              {
                label: t.page.facts.participants,
                value: session.attendees.map((a) => a.name).join(", ") || null,
              },
              {
                label: t.page.facts.responsible,
                value: session.responsible
                  ? `${session.responsible.name} (${
                      session.responsible.why === "owner"
                        ? t.report.responsibleOwner
                        : t.report.responsibleCreator
                    })`
                  : null,
              },
              { label: t.page.facts.notes, value: session.notes },
            ]}
          />
        </PageSection>
      </div>
    </PageContainer>
  );
}
