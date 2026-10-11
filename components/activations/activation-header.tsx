import { IconChevronLeft } from "nucleo-sharp-essential";

import { ViewLink } from "@/components/ui/view-link";
import type { ActivationSummary } from "@/lib/activations/types";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

import {
  ActivationStatusBadge,
  MeasureBadge,
  ProofBadge,
} from "./activation-badges";

const t = fr.activations;

/** An activation's page header: back to the overview, its title, type and
 * mode, the three axes, and where it comes from (ticket RP : « Afficher le
 * chemin de navigation, le projet, le mode de gestion et l'état global sur
 * chaque écran »). */
export function ActivationHeader({
  projectId,
  activation: a,
}: {
  projectId: string;
  activation: ActivationSummary;
}) {
  const source =
    a.sourceKind === "manual"
      ? t.source.manual
      : a.sourceLabel
        ? t.source[a.sourceKind](a.sourceLabel)
        : t.source.removed;
  return (
    <header className="flex flex-col gap-3">
      <ViewLink
        href={routes.projectActivations(projectId)}
        className="-ml-1 inline-flex min-h-10 w-fit items-center gap-1 rounded-md px-1 text-sm text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <IconChevronLeft aria-hidden className="size-4" />
        {t.back}
      </ViewLink>
      <div className="flex flex-col gap-1">
        <h2 className="text-display-sm font-semibold text-balance break-words">
          {a.title}
        </h2>
        <p className="text-sm text-muted-foreground">
          {[t.kinds[a.kind], a.mode ? t.modes[a.mode] : null, source]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <div className="flex items-center gap-2">
          <dt className="text-muted-foreground">{t.columns.status}</dt>
          <dd>
            <ActivationStatusBadge status={a.status} />
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="text-muted-foreground">{t.proof.label}</dt>
          <dd>
            <ProofBadge state={a.proof} />
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="text-muted-foreground">{t.measure.label}</dt>
          <dd>
            <MeasureBadge state={a.measure} />
          </dd>
        </div>
      </dl>
    </header>
  );
}
