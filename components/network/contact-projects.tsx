import { buttonVariants } from "@/components/ui/button";
import { CardRow, ListCard } from "@/components/ui/list-card";
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
 * A contact's part in PDS's projects (proto des pages, 29/10/2026): what
 * waits for them, with « Relancer » (a ready e-mail), then each project with
 * what they do in it.
 */
export function ContactProjects({
  name,
  email,
  projects,
}: {
  name: string;
  email: string | null;
  projects: ContactProject[];
}) {
  const p = fr.network.page;
  const first = name.split(/\s+/)[0] ?? name;
  const awaited = projects.flatMap((project) =>
    project.items.filter(isAwaited).map((item) => ({ project, item })),
  );

  return (
    <>
      {awaited.length > 0 && (
        <ListCard title={p.awaited(name)} count={awaited.length}>
          {awaited.map(({ project, item }) => {
            const todo = p.awaitedTodo[keyOf(item)] ?? keyOf(item);
            const due = item.due ? formatDate(item.due) : null;
            const link = project.link;
            return (
              <CardRow
                key={`${item.kind}-${item.id}`}
                main={todo}
                sub={[
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
                  email && (
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
                      {p.remind}
                    </a>
                  )
                }
              />
            );
          })}
        </ListCard>
      )}
      <ListCard
        title={p.projects}
        empty={projects.length === 0 ? p.projectsEmpty : undefined}
      >
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
            <CardRow
              key={project.projectId}
              href={routes.project(project.projectId)}
              main={project.title}
              sub={
                [project.artist, roles.join(", ")]
                  .filter(Boolean)
                  .join(" · ") || undefined
              }
              badge={
                waiting > 0 && (
                  <StatusBadge tone="info">
                    {p.projectAwaited(waiting)}
                  </StatusBadge>
                )
              }
            />
          );
        })}
      </ListCard>
    </>
  );
}
