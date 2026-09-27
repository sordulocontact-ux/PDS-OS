import Link from "next/link";

import { FactList } from "@/components/ui/fact-list";
import { routes } from "@/lib/auth/redirects";
import type { DesignState } from "@/lib/design/rules";
import { fr } from "@/lib/i18n/fr";

const ORDER: readonly DesignState[] = [
  "submitted",
  "changes_requested",
  "to_design",
  "approved",
];

/** Where the Dossier stands: deliverables per design state, counted by code. */
export function DesignProgress({
  counts,
  projectId,
}: {
  counts: Record<DesignState, number>;
  projectId: string;
}) {
  const t = fr.design.progress;
  const total = ORDER.reduce((sum, state) => sum + counts[state], 0);

  return (
    <section className="grid gap-3">
      <div className="grid gap-1">
        <h3 className="text-sm font-medium">{t.title}</h3>
        <p className="text-sm text-muted-foreground">
          {t.summary(counts.approved, total)}
        </p>
      </div>
      {total > 0 && (
        <FactList
          facts={ORDER.map((state) => ({
            label: fr.design.states[state],
            value: String(counts[state]),
            valueClassName: "tabular-nums",
          }))}
        />
      )}
      <p className="text-sm">
        <Link href={routes.projectStrategy(projectId)}>{t.toStrategy}</Link>
      </p>
    </section>
  );
}
