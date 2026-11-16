import { ContentCard } from "@/components/shell/content-card";
import { projectShell } from "@/lib/i18n/fr/project-shell";
import type { OverviewDependency } from "@/lib/overview/dependencies";
import { cn } from "@/lib/utils";

const fr = { projectShell };

/** « Ce qui dépend d'un autre workflow » (proto « Projet complet »): one
 * line per fact handed over, « A → B », Disponible or Attendu — in words,
 * separated by space, without pills nor rules (retour d'Akili du 05/11). */
export function DependencyRows({ deps }: { deps: OverviewDependency[] }) {
  const t = fr.projectShell.overview.dependencies;
  if (deps.length === 0) return null;
  return (
    <ContentCard title={t.title} quietTitle className="p-6">
      <ul className="flex flex-col gap-3.5 modern:gap-3">
        {deps.map((dep) => (
          <li
            key={dep.key}
            className="grid gap-0.5 text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.8fr)] sm:gap-4"
          >
            <span>{dep.label}</span>
            <span className="text-[color:var(--text-secondary)]">
              {t.flow(dep.from, dep.to)}
            </span>
            <span
              className={cn(
                dep.available
                  ? "text-[color:var(--tone-success-fg)]"
                  : "text-[color:var(--text-secondary)]",
              )}
            >
              {dep.available ? t.available : t.expected}
            </span>
          </li>
        ))}
      </ul>
    </ContentCard>
  );
}
