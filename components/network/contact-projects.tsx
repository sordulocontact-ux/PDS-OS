import { RemindContactButton } from "@/components/network/remind-contact-button";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { SectionRow, SectionRows } from "@/components/ui/section-rows";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { network } from "@/lib/i18n/fr/network";
import {
  isAwaited,
  type ContactProject,
  type ContactProjectItem,
} from "@/lib/network/contact-projects";
import { contactRoleLine } from "@/lib/portal/contact-roles";
import { formatDate } from "@/lib/release/format";
import { mailtoHref } from "@/lib/utils/mailto";

const fr = { network };

// The key of an item, as its role and its awaited gesture are named.
const keyOf = (i: ContactProjectItem) =>
  i.kind === "master" ? i.step : i.kind;

const linkClass = "font-semibold no-underline hover:underline";

/**
 * What waits for a contact across PDS's projects (proto des pages,
 * 29/10/2026), soonest first, each with « Relancer » (the link e-mailed again, else a ready e-mail).
 * Nothing waits: no card.
 */
export function ContactAwaited({
  name,
  email,
  contactId,
  canEmail,
  projects,
}: {
  name: string;
  email: string | null;
  contactId: string;
  // PDS OS can e-mail the contact itself (`emailEnabled()`, read on the
  // server): « Relancer » then re-sends the project link; else a mailto.
  canEmail: boolean;
  projects: ContactProject[];
}) {
  const p = fr.network.page;
  const first = name.split(/\s+/)[0] ?? name;
  const awaited = projects
    .flatMap((project) =>
      project.items.filter(isAwaited).map((item) => ({ project, item })),
    )
    .sort((a, b) => (a.item.due ?? "9").localeCompare(b.item.due ?? "9"));
  if (awaited.length === 0) return null;

  return (
    <PageSection
      card
      id="awaited"
      title={p.awaited(name)}
      description={p.awaitedDescription}
    >
      <SectionRows label={p.awaited(name)}>
        {awaited.map(({ project, item }) => {
          const todo = p.awaitedTodo[keyOf(item)] ?? keyOf(item);
          const due = item.due ? formatDate(item.due) : null;
          const link = project.link;
          return (
            <SectionRow
              key={`${item.kind}-${item.id}`}
              title={<span className="font-semibold">{todo}</span>}
              detail={[
                project.title,
                due && p.awaitedDue(due),
                link?.sentAt && p.linkSent(formatDate(link.sentAt)),
                link?.sentAt &&
                  (link.openedAt
                    ? p.linkOpened(formatDate(link.openedAt))
                    : p.linkNotOpened),
              ]
                .filter(Boolean)
                .join(" · ")}
              badge={
                canEmail && email ? (
                  <RemindContactButton
                    projectId={project.projectId}
                    contactId={contactId}
                    label={p.remind}
                    ariaLabel={p.remindLabel(todo)}
                  />
                ) : email ? (
                  <a
                    href={mailtoHref(
                      email,
                      p.remindSubject(todo, project.title),
                      p.remindBody(first, todo, project.title, due),
                    )}
                    aria-label={p.remindLabel(todo)}
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                    })}
                  >
                    <ButtonRoll>{p.remind}</ButtonRoll>
                  </a>
                ) : null
              }
            />
          );
        })}
      </SectionRows>
    </PageSection>
  );
}

/** Each project the contact is in, what they do in it, its artist. */
export function ContactInProjects({
  projects,
}: {
  projects: ContactProject[];
}) {
  const p = fr.network.page;
  return (
    <PageSection
      card
      id="projects"
      title={p.projects}
      description={p.projectsDescription}
    >
      {projects.length === 0 ? (
        <EmptyNote>{p.projectsEmpty}</EmptyNote>
      ) : (
        <SectionRows label={p.projects}>
          {projects.map((project) => {
            const waiting = project.items.filter(isAwaited).length;
            const roles = [
              ...project.team,
              contactRoleLine(
                project.items.filter((i) => i.kind !== "call").map(keyOf),
              ),
            ].filter(Boolean);
            if (
              roles.length === 0 &&
              project.items.some((i) => i.kind === "call")
            )
              roles.push(p.invitedToCall);
            return (
              <SectionRow
                key={project.projectId}
                title={
                  <>
                    <ViewLink
                      href={routes.project(project.projectId)}
                      className={linkClass}
                    >
                      {project.title}
                    </ViewLink>
                    {roles.length > 0 && ` · ${roles.join(", ")}`}
                  </>
                }
                detail={waiting > 0 ? p.projectAwaited(waiting) : null}
                badge={
                  project.artist && (
                    <StatusBadge tone="neutral" size="sm">
                      {project.artist}
                    </StatusBadge>
                  )
                }
              />
            );
          })}
        </SectionRows>
      )}
    </PageSection>
  );
}

/** The fiches de renseignements sent to the contact, one per project:
 * returned or not. None: no card. */
export function ContactFiches({ projects }: { projects: ContactProject[] }) {
  const p = fr.network.page;
  const fiches = projects.flatMap((project) =>
    project.items
      .filter((i) => i.kind === "form")
      .map((item) => ({ project, item })),
  );
  if (fiches.length === 0) return null;
  return (
    <PageSection
      card
      id="fiche"
      title={p.fiche}
      description={p.ficheDescription}
    >
      <SectionRows label={p.fiche}>
        {fiches.map(({ project, item }) => (
          <SectionRow
            key={item.id}
            title={<span className="font-semibold">{project.title}</span>}
            detail={p.ficheSentOn(formatDate(item.at))}
            badge={
              <StatusBadge
                tone={item.state === "done" ? "success" : "info"}
                size="sm"
              >
                {item.state === "done" ? p.ficheDone : p.ficheTodo}
              </StatusBadge>
            }
          />
        ))}
      </SectionRows>
    </PageSection>
  );
}
