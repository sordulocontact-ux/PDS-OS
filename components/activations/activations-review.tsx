import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ViewLink } from "@/components/ui/view-link";
import { reserveText } from "@/lib/activations/describe";
import type { ActivationSummary } from "@/lib/activations/types";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

import {
  ActivationStatusBadge,
  MeasureBadge,
  ProofBadge,
} from "./activation-badges";

const t = fr.activations;

/**
 * What the Marketing's review receives from the activations (ticket : « Les
 * éléments nécessaires au bilan sont transmis avec provenance, date et
 * niveau de vérification ») : the three axes of each, and its reserves —
 * those kept at closure, else the current ones.
 */
export function ActivationsReview({
  projectId,
  rows,
}: {
  projectId: string;
  rows: ActivationSummary[];
}) {
  const live = rows.filter((a) => a.status !== "cancelled");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.review.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{t.review.description}</p>
      </CardHeader>
      <CardContent>
        {live.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.review.none}</p>
        ) : (
          <ul className="divide-y">
            {live.map((a) => {
              const reserves =
                a.status === "closed" ? (a.closureReserves ?? []) : a.reserves;
              return (
                <li key={a.id} className="flex flex-col gap-1.5 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <ViewLink
                      href={routes.projectActivation(projectId, a.id)}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {a.title}
                    </ViewLink>
                    <span className="flex flex-wrap gap-1.5">
                      <ActivationStatusBadge status={a.status} />
                      <ProofBadge state={a.proof} />
                      <MeasureBadge state={a.measure} />
                    </span>
                  </div>
                  <p className="text-muted-foreground">
                    {t.kinds[a.kind]}
                    {" · "}
                    {reserves.length === 0
                      ? t.review.noReserves
                      : `${t.review.reserves} : ${reserves.map(reserveText).join(" ; ")}`}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
