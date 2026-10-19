import { ContentCard } from "@/components/shell/content-card";
import { InfoRow, Rows } from "@/components/ui/rows";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import type { OverviewDependency } from "@/lib/overview/dependencies";

/** « Ce qui dépend d'un autre workflow » (proto « Projet complet »): one
 * line per fact handed over, « A → B », Disponible or Attendu. */
export function DependencyRows({ deps }: { deps: OverviewDependency[] }) {
  const t = fr.projectShell.overview.dependencies;
  if (deps.length === 0) return null;
  return (
    <ContentCard title={t.title}>
      <Rows>
        {deps.map((dep) => (
          <InfoRow
            key={dep.key}
            title={dep.label}
            detail={t.flow(dep.from, dep.to)}
            badge={
              <StatusBadge tone={dep.available ? "success" : "neutral"}>
                {dep.available ? t.available : t.expected}
              </StatusBadge>
            }
          />
        ))}
      </Rows>
    </ContentCard>
  );
}
