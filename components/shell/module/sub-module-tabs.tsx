import { ButtonRoll } from "@/components/ui/button";
import { DoneCheck } from "@/components/ui/done-check";
import { MineBadge } from "@/components/ui/mine-badge";
import { ViewLink } from "@/components/ui/view-link";
import { moduleFrame } from "@/lib/i18n/fr/module-frame";
import { cn } from "@/lib/utils";

const fr = { moduleFrame };

/** One sub-module of a workflow (a pill above the module's title). */
export type SubModuleTab = {
  key: string;
  label: string;
  // Without it (no page yet, or locked), the pill is greyed, not a link,
  // and `title` says why.
  href?: string;
  title?: string;
  // The page shown belongs to it: ink pill.
  current: boolean;
  // Entirely done (computed by the server): a green check before the label.
  done?: boolean;
  // Actions waiting for the viewer in it: a blue counter after the label.
  mine?: number;
};

const pill =
  "inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] no-underline whitespace-nowrap transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)]";

/**
 * The sub-modules of the Marketing as pills, between the trail and the title
 * (proto « Projet complet », docs/DESIGN.md § 4): the open one in ink, a
 * green check on those done, the viewer's count in blue. No other workflow
 * has them: their steps are in the journey. A pill not current rolls its
 * label on hover, as a button's (ButtonRoll), without growing.
 */
export function SubModuleTabs({
  label = fr.moduleFrame.subModules,
  tabs,
}: {
  label?: string;
  tabs: SubModuleTab[];
}) {
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-1">
        {tabs.map((tab) => {
          const body = (
            <>
              {tab.done && <DoneCheck />}
              {tab.label}
              <MineBadge count={tab.mine ?? 0} />
            </>
          );
          return (
            <li key={tab.key}>
              {tab.href ? (
                <ViewLink
                  href={tab.href}
                  aria-current={tab.current ? "page" : undefined}
                  className={cn(
                    pill,
                    tab.current
                      ? "bg-[var(--control-primary-bg)] text-[color:var(--control-primary-fg)]"
                      : "group/button bg-[var(--surface-soft)] text-[color:var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-foreground",
                  )}
                >
                  <ButtonRoll>{body}</ButtonRoll>
                </ViewLink>
              ) : (
                <span
                  aria-disabled
                  title={tab.title}
                  className={cn(
                    pill,
                    "bg-[var(--surface-soft)] text-[color:var(--text-muted)]",
                  )}
                >
                  {body}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
