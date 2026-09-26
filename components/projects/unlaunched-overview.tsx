import Link from "next/link";

import { AssignmentHistory } from "@/components/projects/assignment-history";
import { TransmissionPanel } from "@/components/projects/transmission-panel";
import { routes } from "@/lib/auth/redirects";
import { masterLabel } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";
import type { ProjectDetail } from "@/lib/projects/types";
import { FactList } from "@/components/ui/fact-list";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const euroFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

// Overview of a project not launched yet: its handover status and next
// action, what was entered at creation, its masters. No stage, no section.
export function UnlaunchedOverview({
  project,
  viewerPersonId,
  canTransmit,
  people,
  creativeTeam,
}: {
  project: ProjectDetail;
  viewerPersonId: string | null;
  canTransmit: boolean;
  people: Array<{ personId: string; name: string }>;
  creativeTeam: React.ReactNode;
}) {
  const t = fr.shell.project.overview;
  const facts: Array<[string, string | null, boolean?]> = [
    [t.type, fr.shell.projectTypes[project.type]],
    [
      t.dueDate,
      project.dueDate
        ? dateFormatter.format(new Date(`${project.dueDate}T00:00:00`))
        : null,
    ],
    [
      t.budget,
      project.budgetCents !== null
        ? euroFormatter.format(project.budgetCents / 100)
        : null,
      true,
    ],
    [
      t.priority,
      project.priority ? fr.shell.priorities[project.priority] : null,
    ],
    [t.createdAt, dateFormatter.format(new Date(project.createdAt))],
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex min-w-0 flex-col gap-8">
        <TransmissionPanel
          project={project}
          viewerPersonId={viewerPersonId}
          canTransmit={canTransmit}
          people={people}
        />

        <section
          aria-labelledby="masters-title"
          className="flex flex-col gap-3"
        >
          <h2 id="masters-title" className="text-base font-medium">
            {t.masters}
          </h2>
          {project.masters.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noMasters}</p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {project.masters.map((master) => (
                <li key={master.id} className="relative px-4 py-3">
                  <Link
                    href={routes.master(master.id)}
                    className="text-sm font-medium no-underline after:absolute after:inset-0 hover:underline"
                  >
                    {masterLabel(master)}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {master.artists}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {project.framingNotes && (
          <section
            aria-labelledby="notes-title"
            className="flex flex-col gap-3"
          >
            <h2 id="notes-title" className="text-base font-medium">
              {t.framingNotes}
            </h2>
            <p className="text-sm whitespace-pre-line">
              {project.framingNotes}
            </p>
          </section>
        )}

        {creativeTeam}
        <AssignmentHistory assignments={project.assignments} />
      </div>

      <section aria-labelledby="facts-title" className="flex flex-col gap-3">
        <h2 id="facts-title" className="text-base font-medium">
          {t.facts}
        </h2>
        <FactList
          facts={facts.map(([label, value, figure]) => ({
            label,
            value,
            valueClassName: figure ? "tabular-nums" : undefined,
          }))}
          emptyLabel={t.notProvided}
        />
      </section>
    </div>
  );
}
