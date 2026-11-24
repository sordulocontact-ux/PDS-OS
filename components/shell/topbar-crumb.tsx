import { RecordSwitcher } from "@/components/shell/record-switcher";
import { ViewLink } from "@/components/ui/view-link";
import { shell } from "@/lib/i18n/fr/shell";
import type { SwitcherKind } from "@/lib/shell/switcher";

const fr = { shell };

export type CrumbLink = { label: string; href: string };
export type CrumbSwitcher = { kind: SwitcherKind; id: string; base?: string };

/**
 * Where one is, in a page's top band (Sacha 24/11/2026, in place of the
 * search, which went to the main sidebar): the section's page alone
 * (« Deals »), or « Deals / Sortie Nova ⌄ » for a page opened from it, the
 * section a link back to its list (the back link it replaces) and the
 * record's name opening the others of its list (`switcher`).
 */
export function TopbarCrumb({
  parents = [],
  title,
  switcher,
}: {
  parents?: CrumbLink[];
  title: string;
  switcher?: CrumbSwitcher;
}) {
  const list = parents[parents.length - 1];
  return (
    <nav aria-label={fr.shell.topbar.crumb} className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1 text-body-md">
        {parents.map((parent) => (
          <li
            key={parent.href}
            className="flex min-w-0 shrink items-center gap-1 max-sm:hidden"
          >
            <ViewLink
              href={parent.href}
              className="truncate rounded-md px-1 text-[color:var(--text-secondary)] no-underline hover:text-[color:var(--text-primary)]"
            >
              {parent.label}
            </ViewLink>
            <span aria-hidden className="text-[color:var(--text-tertiary)]">
              /
            </span>
          </li>
        ))}
        <li className="flex min-w-0 items-center">
          {switcher && list ? (
            <RecordSwitcher
              kind={switcher.kind}
              id={switcher.id}
              base={switcher.base}
              name={title}
              allHref={list.href}
            />
          ) : (
            <span
              aria-current="page"
              className="truncate px-1 font-medium text-[color:var(--text-primary)]"
            >
              {title}
            </span>
          )}
        </li>
      </ol>
    </nav>
  );
}
