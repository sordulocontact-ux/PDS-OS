import Link from "next/link";

import { HandoverFacts } from "@/components/projects/handover-facts";
import { RespondPanel } from "@/components/projects/respond-panel";
import { TransmitDialog } from "@/components/projects/transmit-dialog";
import { ModuleHeader } from "@/components/shell/module/module-header";
import { WhoDoesWhatButton } from "@/components/shell/module/who-does-what-button";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import {
  BlockFact,
  FactBlockRow,
  factBlockTitleClass,
} from "@/components/ui/fact-block";
import { NameChip, NameChips } from "@/components/ui/name-chip";
import { ToneCallout } from "@/components/ui/tone-callout";
import { formatDay } from "@/lib/assistant/facts";
import { routes } from "@/lib/auth/redirects";
import { shell } from "@/lib/i18n/fr/shell";
import { transmission } from "@/lib/i18n/fr/transmission";
import type { CreativeMember } from "@/lib/projects/creatives";
import type { ProjectDetail } from "@/lib/projects/types";

const fr = { shell, transmission };

/**
 * A project not launched yet (Sacha 30/10/2026: one gesture, the page like
 * the others): the module's head (« Projets / Néons », « Qui fait quoi »),
 * the question or the refusal received, then what is transmitted in one
 * block of facts (`HandoverFacts`) with the only gesture under it (the
 * direction transmits, answers or hands it to someone else; the chosen
 * manager accepts, asks or refuses). No « À vous » line: the block and its
 * buttons say it (Sacha 30/10/2026). No history either: it is only the
 * transmission, said in the block (it stays in Équipe). No step, no section.
 * A collective opens on its recap (retours d'Ibé du 18/11/2026, lot 2),
 * right under its head and the answer received, before the handover.
 */
export function UnlaunchedOverview({
  project,
  viewerPersonId,
  canTransmit,
  people,
  creatives,
  creativeTeam,
  cover,
  subtitle,
  status: kindStatus,
  titles,
}: {
  project: ProjectDetail;
  viewerPersonId: string | null;
  canTransmit: boolean;
  people: Array<{ personId: string; name: string }>;
  creatives: CreativeMember[];
  // The creative directors' list, managed in « Qui fait quoi ».
  creativeTeam: React.ReactNode;
  // The head of every project (ProjectCover, « Artiste · Type »).
  cover?: React.ReactNode;
  subtitle?: string;
  // « Projet collectif » on the right of the name (docs/pds-mic-plan.md).
  status?: React.ComponentProps<typeof ModuleHeader>["status"];
  // A collective's recap (docs/pds-mic-plan.md, lot 2; retours d'Ibé du
  // 18/11/2026, lot 2), last: long, it hid the gesture (23/11/2026).
  titles?: React.ReactNode;
}) {
  const t = fr.transmission.page;
  const latest = project.assignments[0] ?? null;
  const status = project.status;
  const name = latest?.assigneeName ?? "";
  const isAssignee =
    status === "pending" && latest?.assigneePersonId === viewerPersonId;
  const mayTransmit =
    canTransmit &&
    (status === "not_transmitted" ||
      status === "refused" ||
      status === "clarification_requested");

  const received =
    latest?.response &&
    (status === "refused" || status === "clarification_requested")
      ? {
          title:
            status === "refused"
              ? t.refused(name)
              : t.asked(
                  name,
                  latest.subject
                    ? fr.transmission.subjects[latest.subject]
                    : fr.transmission.subjects.other,
                ),
          text: latest.response,
        }
      : null;

  const title = isAssignee
    ? t.titles.accept
    : status === "not_transmitted"
      ? mayTransmit
        ? t.titles.transmit
        : t.titles.project
      : t.titles.sent;
  // Who transmitted it, to the one who receives it; to whom, to the others.
  const sent = status === "pending" && latest;
  const head = sent && (
    <FactBlockRow>
      <BlockFact
        label={isAssignee ? t.facts.transmittedBy : t.facts.transmittedTo}
      >
        <NameChips>
          <NameChip
            name={isAssignee ? latest.assignedByName : latest.assigneeName}
            person
          />
        </NameChips>
      </BlockFact>
      <BlockFact label={t.facts.on}>{formatDay(latest.createdAt)}</BlockFact>
    </FactBlockRow>
  );

  return (
    <div className="flex flex-col gap-5">
      <ModuleHeader
        crumbs={[
          { label: fr.shell.nav.projects, href: routes.projects },
          { label: project.title },
        ]}
        title={project.title}
        media={cover}
        subtitle={subtitle}
        status={kindStatus}
        actions={
          <WhoDoesWhatButton
            roles={[
              {
                key: "direction",
                label: t.roles.direction,
                kind: "exec",
                holder: latest ? { name: latest.assignedByName } : null,
                what: t.roles.directionWhat,
              },
              {
                key: "manager",
                label: t.roles.manager,
                kind: "exec",
                holder: latest && status !== "refused" ? { name } : null,
                what: t.roles.managerWhat,
              },
            ]}
            personLinks={creativeTeam}
          />
        }
      />

      {received && (
        <ToneCallout tone="warning" as="div">
          <span className="flex flex-col gap-1">
            <span className="font-semibold">{received.title}</span>
            <span className="whitespace-pre-line">« {received.text} »</span>
          </span>
        </ToneCallout>
      )}

      <section
        aria-labelledby="handover-title"
        className="flex flex-col gap-3.5 modern:gap-3"
      >
        <h2 id="handover-title" className={factBlockTitleClass}>
          {title}
        </h2>
        <HandoverFacts
          project={project}
          creatives={creatives}
          head={head}
          note={
            sent && latest.note
              ? { by: latest.assignedByName, text: latest.note }
              : null
          }
        />
        {isAssignee && latest && (
          <>
            <p className="max-w-[72ch] text-caption text-[color:var(--text-secondary)]">
              {t.acceptHint}
            </p>
            <RespondPanel assignmentId={latest.id} />
          </>
        )}
        {mayTransmit &&
          (people.length > 0 ? (
            <div>
              <TransmitDialog
                projectId={project.id}
                people={people}
                mode={
                  status === "clarification_requested"
                    ? "answer"
                    : status === "refused"
                      ? "reassign"
                      : "first"
                }
                defaultAssigneeId={latest?.assigneePersonId}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-caption text-[color:var(--text-secondary)]">
                {fr.transmission.panel.noManager}
              </p>
              <Link
                href={routes.members}
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                <ButtonRoll>{fr.transmission.panel.toMembers}</ButtonRoll>
              </Link>
            </div>
          ))}
      </section>

      {titles}
    </div>
  );
}
