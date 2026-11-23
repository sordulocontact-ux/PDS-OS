import { RemindContactButton } from "@/components/network/remind-contact-button";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableMedia,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
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
  const c = p.columns;
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
      <DataTable framed>
        <DataTableHeader>
          <DataTableHead>{c.todo}</DataTableHead>
          <DataTableHead hideBelow="sm">{c.project}</DataTableHead>
          <DataTableHead hideBelow="md">{c.due}</DataTableHead>
          <DataTableHead hideBelow="lg">{c.link}</DataTableHead>
          <DataTableHead fill align="end">
            <span className="sr-only">{c.actions}</span>
          </DataTableHead>
        </DataTableHeader>
        <DataTableBody>
          {awaited.map(({ project, item }) => {
            const todo = p.awaitedTodo[keyOf(item)] ?? keyOf(item);
            const due = item.due ? formatDate(item.due) : null;
            const link = project.link;
            return (
              <DataTableRow key={`${item.kind}-${item.id}`}>
                <DataTableCell className="break-words">{todo}</DataTableCell>
                <DataTableCell hideBelow="sm" className="break-words">
                  {project.title}
                </DataTableCell>
                <DataTableCell hideBelow="md" className="tabular-nums">
                  {due ?? EMPTY_CELL}
                </DataTableCell>
                <DataTableCell hideBelow="lg">
                  {link?.sentAt ? (
                    <DataTableMedia
                      title={p.linkSentOn(formatDate(link.sentAt))}
                      subtitle={
                        link.openedAt
                          ? p.linkOpened(formatDate(link.openedAt))
                          : p.linkNotOpened
                      }
                    />
                  ) : (
                    EMPTY_CELL
                  )}
                </DataTableCell>
                <DataTableCell fill align="end">
                  {canEmail && email ? (
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
                  ) : null}
                </DataTableCell>
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>
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
        <DataTable framed>
          <DataTableHeader>
            <DataTableHead>{p.columns.project}</DataTableHead>
            <DataTableHead hideBelow="sm">{p.columns.artist}</DataTableHead>
            <DataTableHead fill>{p.columns.role}</DataTableHead>
          </DataTableHeader>
          <DataTableBody>
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
                <DataTableRow key={project.projectId}>
                  <DataTableCell>
                    <DataTableMedia
                      title={
                        <DataTableLink href={routes.project(project.projectId)}>
                          {project.title}
                        </DataTableLink>
                      }
                      subtitle={waiting > 0 ? p.projectAwaited(waiting) : null}
                    />
                  </DataTableCell>
                  <DataTableCell hideBelow="sm" className="break-words">
                    {project.artist ?? EMPTY_CELL}
                  </DataTableCell>
                  <DataTableCell fill className="break-words">
                    {roles.join(", ") || EMPTY_CELL}
                  </DataTableCell>
                </DataTableRow>
              );
            })}
          </DataTableBody>
        </DataTable>
      )}
    </PageSection>
  );
}

/** The fiches de renseignements sent to the contact, one per project:
 * returned or not. None: no card. Its own Réseau fiche is in
 * « Coordonnées » (ContactFiche). */
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
      {fiches.length > 0 && (
        <DataTable framed>
          <DataTableHeader>
            <DataTableHead>{p.columns.project}</DataTableHead>
            <DataTableHead hideBelow="sm">{p.columns.sentOn}</DataTableHead>
            <DataTableHead fill>{p.columns.state}</DataTableHead>
          </DataTableHeader>
          <DataTableBody>
            {fiches.map(({ project, item }) => (
              <DataTableRow key={item.id}>
                <DataTableCell className="break-words">
                  {project.title}
                </DataTableCell>
                <DataTableCell hideBelow="sm" className="tabular-nums">
                  {formatDate(item.at)}
                </DataTableCell>
                <DataTableCell fill>
                  <StatusBadge
                    tone={item.state === "done" ? "success" : "info"}
                    size="sm"
                  >
                    {item.state === "done" ? p.ficheDone : p.ficheTodo}
                  </StatusBadge>
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </PageSection>
  );
}
