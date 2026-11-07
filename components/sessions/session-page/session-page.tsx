import Link from "next/link";

import { ProjectHeader } from "@/components/projects/project-header";
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
import { can, type Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { sessions } from "@/lib/i18n/fr/sessions";
import { shell } from "@/lib/i18n/fr/shell";
import { sessionsHref, type SessionDoor } from "@/lib/sessions/door";
import type { SessionRef, StudioSession } from "@/lib/sessions/types";
import { sessionStateTone } from "@/lib/ui/state-tones";
import { formatDay } from "@/lib/utils/day";

const fr = { sessions, shell };

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

/**
 * One studio session's page, whichever door opened it (lib/sessions/door.ts):
 * inside a project, under its header and trail « Sessions studio / name »;
 * elsewhere, on its own, with the way back to where it was opened from
 * (`backLabel`). Its state is computed (lib/sessions/state.ts). Before the
 * séance: its preparation first, then the titles and the files; the report
 * only opens once it starts (Ibé, 06/11/2026). After: the report first (the
 * gesture of its responsible, then the sheet everyone reads), the titles,
 * the files, then its facts.
 */
export function SessionPageView({
  session,
  access,
  door,
  backLabel,
}: {
  session: StudioSession;
  access: Access;
  door: SessionDoor;
  backLabel: string;
}) {
  const t = fr.sessions;
  const canEdit = can(access, "manage_sessions");
  const back = sessionsHref(door);
  const name = sessionName(session);
  const when = [
    session.date ? formatDay(session.date) : t.noDate,
    sessionHours(session),
  ]
    .filter(Boolean)
    .join(" · ");
  const status = {
    label: t.states[session.state],
    tone: sessionStateTone[session.state],
  };
  const before = session.state === "planned" || session.state === "cancelled";
  const actions = canEdit ? (
    <SessionHeaderActions session={session} afterDeleteHref={back} />
  ) : null;

  const facts = (
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
  );

  const body = (
    <div className="flex flex-col gap-[var(--section-gap)]">
      {before ? (
        <PageSection
          card
          id="preparation"
          title={t.page.prepTitle}
          description={t.page.prepDescription}
        >
          {facts}
        </PageSection>
      ) : (
        <ReportSection
          session={session}
          viewerPersonId={access.personId}
          canEdit={canEdit}
        />
      )}
      <TitlesSection session={session} canEdit={canEdit} />
      <LinksSection
        sessionId={session.id}
        links={session.links}
        canEdit={canEdit}
      />
      {!before && (
        <PageSection card id="informations" title={t.page.infoTitle}>
          {facts}
        </PageSection>
      )}
    </div>
  );

  if (door.kind === "project")
    return (
      <div className="flex flex-col gap-6">
        <ProjectHeader
          projectId={door.projectId}
          crumbs={[
            { label: fr.shell.project.sidebar.sessions, href: back },
            { label: name },
          ]}
          title={name}
          status={status}
          actions={actions}
          facts={[{ key: "when", value: when }]}
        />
        {body}
      </div>
    );

  return (
    <PageContainer className="max-w-5xl">
      <BackLink href={back}>{backLabel}</BackLink>
      <PageHeader
        title={name}
        badge={<StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
        description={when}
        action={actions}
      />
      {body}
    </PageContainer>
  );
}
