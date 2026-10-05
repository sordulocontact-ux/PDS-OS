import Link from "next/link";

import { sectionCardClass } from "@/components/ui/section-card";
import { routes } from "@/lib/auth/redirects";
import { countFacts } from "@/lib/facts/types";
import { fr } from "@/lib/i18n/fr";
import type { LegalInventory } from "@/lib/legal/types";
import { cn } from "@/lib/utils";

/**
 * The side panel of the Cadrage juridique (ticket Juridique 01: « Sortie,
 * Personnes, Droits, Accords, Formalités et Responsables »): the État des
 * lieux in one line per area, recomputed after each answer, then the
 * third-party elements opened by the answers. Responsibles are named at the
 * plan, not yet.
 */
export function DossierPanel({
  projectId,
  inventory,
  clearances,
}: {
  projectId: string;
  inventory: LegalInventory;
  clearances: number;
}) {
  const t = fr.legal.intake.panel;
  const sections = fr.legal.inventory.sections;
  return (
    <aside
      aria-labelledby="legal-dossier-title"
      className={cn("flex flex-col gap-4", sectionCardClass)}
    >
      <div className="flex flex-col gap-0.5">
        <h2 id="legal-dossier-title" className="text-base font-medium">
          {t.title}
        </h2>
        <p className="text-sm text-muted-foreground">{t.description}</p>
      </div>
      <dl className="flex flex-col gap-3 text-sm">
        {inventory.sections.map((section) => {
          const c = countFacts([section]);
          return (
            <div key={section.key} className="flex flex-col gap-0.5">
              <dt className="font-medium">{sections[section.key].title}</dt>
              <dd className="text-muted-foreground tabular-nums">
                {t.line(c.known, c.to_confirm, c.missing)}
              </dd>
            </div>
          );
        })}
        <div className="flex flex-col gap-0.5">
          <dt className="font-medium">{t.thirdParty}</dt>
          <dd className="text-muted-foreground">{t.clearances(clearances)}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="font-medium">{t.responsibles}</dt>
          <dd className="text-muted-foreground">{t.responsiblesNote}</dd>
        </div>
      </dl>
      <Link
        href={routes.projectLegal(projectId)}
        className="text-sm font-medium underline-offset-4 hover:underline"
      >
        {t.open}
      </Link>
    </aside>
  );
}
