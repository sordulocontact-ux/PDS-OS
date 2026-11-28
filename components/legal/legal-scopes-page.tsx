import { ProjectHeader } from "@/components/projects/project-header";
import {
  ModuleScopesList,
  type ModuleScopeRow,
} from "@/components/projects/tracks/module-scopes-list";
import { shell } from "@/lib/i18n/fr/shell";
import {
  scopeEntry,
  type LegalScope,
  type TitleLayout,
} from "@/lib/legal/title-groups";
import type { WorkflowCard } from "@/lib/overview/cards";

const fr = { shell };

/**
 * The entry of a collective's Juridique (Sacha, 28/11/2026: never a scope
 * chosen by the code): « Projet » (the Dossier, the démarches of the whole
 * project, « Prêt pour la sortie ») then each title that has steps of its
 * own (« 1 par son », Maël 23/11/2026), each with its ring, the step it
 * opens on and « À vous » when one of its steps waits for the viewer. A
 * name opens its scope where LegalStepFrame's switcher does (scopeEntry).
 */
export function LegalScopesPage({
  projectId,
  layout,
}: {
  projectId: string;
  layout: TitleLayout;
}) {
  const rows = layout.scopes.flatMap((scope): ModuleScopeRow[] => {
    const entry = scopeEntry(scope);
    if (!entry) return [];
    return [
      {
        key: scope.key,
        label: scope.label,
        href: entry.href,
        card: cardOf(scope, entry.href, entry.title),
      },
    ];
  });
  return (
    <div className="flex flex-col gap-6">
      <ProjectHeader
        projectId={projectId}
        title={fr.shell.project.sidebar.legal}
      />
      <ModuleScopesList rows={rows} />
    </div>
  );
}

/** A scope as the cells of « Titres » read a workflow: its steps done of
 * all, the step it opens on, the viewer's next action (the figures are the
 * code's, never stored). */
function cardOf(
  scope: LegalScope,
  href: string,
  stepTitle: string,
): WorkflowCard {
  const finished = (status: string) =>
    status === "done" || status === "obsolete";
  const done = scope.steps.filter((s) => finished(s.status)).length;
  const mine = scope.steps.find((s) => s.actor?.viewer && !finished(s.status));
  return {
    workflow: "legal",
    restricted: false,
    status: done === scope.steps.length ? "done" : "in_progress",
    href,
    index: scope.steps.findIndex((s) => s.href === href) + 1,
    total: scope.steps.length,
    stepTitle,
    done,
    next: mine?.actor
      ? { mine: true, who: mine.actor.name, todo: mine.actor.todo }
      : null,
  };
}
