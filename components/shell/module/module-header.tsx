import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import { ModuleCrumbs, type ModuleCrumb } from "./module-crumbs";
import { ModuleFacts, type ModuleFact } from "./module-facts";
import { SubModuleTabs, type SubModuleTab } from "./sub-module-tabs";

type Tone = React.ComponentProps<typeof StatusBadge>["tone"];

export type ModuleHeaderProps = {
  // « Projet › Module › [sous-module ›] Étape »; the last one is the page.
  crumbs: ModuleCrumb[];
  // The Marketing's sub-modules only.
  tabs?: SubModuleTab[];
  // The module's name, the page's h1 (« Stratégie », « Master »).
  title: string;
  // The workflow's state next to the title (Distribution: « En attente »).
  status?: { label: string; tone: Tone };
  // On the right of the title: « Qui fait quoi », « Ajouter une dépense ».
  actions?: React.ReactNode;
  facts?: ModuleFact[];
  className?: string;
};

/**
 * The head of every module (proto « Projet complet », docs/DESIGN.md § 4,
 * « En-tête de module »): the trail, the Marketing's pills, the 30 px title
 * with its state and its actions, then the line of facts. Server-safe and
 * stateless. `data-module-header` lets the project layout drop its own
 * default header when a page renders one (docs/ARCHITECTURE.md § 3 ter).
 */
export function ModuleHeader({
  crumbs,
  tabs,
  title,
  status,
  actions,
  facts,
  className,
}: ModuleHeaderProps) {
  return (
    <header
      data-module-header=""
      className={cn("flex min-w-0 flex-col gap-5", className)}
    >
      <ModuleCrumbs crumbs={crumbs} />
      {tabs && tabs.length > 0 && <SubModuleTabs tabs={tabs} />}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h1 className="min-w-0 text-[length:var(--type-display-module)] leading-[var(--type-display-module-lh)] break-words">
            {title}
          </h1>
          {status && (
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
      {facts && <ModuleFacts facts={facts} />}
    </header>
  );
}

export type { ModuleCrumb, ModuleFact, SubModuleTab };
