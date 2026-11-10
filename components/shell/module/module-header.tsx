import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import { ModuleCrumbs, type ModuleCrumb } from "./module-crumbs";
import { ModuleFacts, type ModuleFact } from "./module-facts";
import { SubModuleTabs, type SubModuleTab } from "./sub-module-tabs";

type Tone = React.ComponentProps<typeof StatusBadge>["tone"];

export type ModuleHeaderProps = {
  // « Module / [sous-module /] Étape »; the last one is the page.
  crumbs: ModuleCrumb[];
  // The Marketing's sub-modules only.
  tabs?: SubModuleTab[];
  // The module's name, the page's h1 (« Stratégie », « Master »).
  title: string;
  // Under the title, quiet (the overview: « Mona Lys · Single »).
  subtitle?: string;
  // Before the title (the overview: the project's cover).
  media?: React.ReactNode;
  // On the right of the title, before its state: the open step's due date.
  meta?: React.ReactNode;
  // Under the title: why the open step matters, when the title is the step's
  // (a module page with a journey, docs/VISION-UX.md § 4).
  why?: string;
  // The workflow's state, on the right of the title's line (Distribution:
  // « En attente »).
  status?: { label: string; tone: Tone };
  // On the right of the title: « Qui fait quoi », « Ajouter une dépense ».
  actions?: React.ReactNode;
  facts?: ModuleFact[];
  className?: string;
};

/**
 * The head of every module (proto « Projet complet », docs/DESIGN.md § 4,
 * « En-tête de module »): the trail, laid in the bar at the top of the page
 * (Figma PDS OS 304:20801: ProjectFrame draws the bar and positions this
 * header's trail in it, no positioned box between them), the Marketing's
 * pills, the 30 px title with its state and its actions, then the module's
 * own facts when it gives some. On a module page with a journey the title is
 * the open step's, with its due date (`meta`) and its why under it (proto
 * « Mise en page des modules », Sacha 10/11/2026). Server-safe and stateless. `data-module-header` lets the project layout drop its own
 * default header when a page renders one (docs/ARCHITECTURE.md § 3 ter).
 */
export function ModuleHeader({
  crumbs,
  tabs,
  title,
  subtitle,
  media,
  meta,
  why,
  status,
  actions,
  facts,
  className,
}: ModuleHeaderProps) {
  const heading = (
    <h1 className="min-w-0 text-[length:var(--type-display-module)] leading-[var(--type-display-module-lh)] break-words">
      {title}
    </h1>
  );
  return (
    <header
      data-module-header=""
      className={cn("flex min-w-0 flex-col gap-5", className)}
    >
      <ModuleCrumbs
        crumbs={crumbs}
        className="absolute inset-x-0 top-0 flex h-[var(--project-bar-height)] items-center overflow-hidden px-6"
      />
      {tabs && tabs.length > 0 && <SubModuleTabs tabs={tabs} />}
      {/* Proto `.headrow`: the title on the left, its state on the right of
          the line, before the actions; a step's why right under it. */}
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {media || subtitle ? (
            <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-5">
              {media}
              <div className="flex min-w-0 flex-col gap-1">
                {heading}
                {subtitle && (
                  <p className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] text-[color:var(--text-secondary)]">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
          ) : (
            heading
          )}
          {(meta || status || actions) && (
            <div className="flex flex-wrap items-center gap-2.5">
              {meta}
              {status && (
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              )}
              {actions}
            </div>
          )}
        </div>
        {why && (
          <p className="max-w-[68ch] text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] text-[color:var(--text-secondary)]">
            {why}
          </p>
        )}
      </div>
      {facts && <ModuleFacts facts={facts} />}
    </header>
  );
}

export type { ModuleCrumb, ModuleFact, SubModuleTab };
