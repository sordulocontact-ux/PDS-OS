import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type { StrategyData } from "@/lib/strategy/queries";

/** The Brief the strategy builds on, read-only, one click from the framing. */
export function BriefReminder({
  brief,
  validated,
  projectId,
}: {
  brief: StrategyData["brief"];
  validated: boolean;
  projectId: string;
}) {
  const t = fr.strategy.brief;
  const filled = brief.filter((f) => f.value);

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{t.title}</h3>
        <StatusBadge tone={validated ? "success" : "warning"} size="sm">
          {validated ? t.validated : t.notValidated}
        </StatusBadge>
      </div>
      {filled.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <dl className="grid gap-2 text-sm">
          {filled.map((field) => (
            <div key={field.key} className="grid gap-0.5">
              <dt className="text-xs text-muted-foreground">
                {fr.framing.fields[field.key]}
              </dt>
              <dd className="line-clamp-4 whitespace-pre-wrap">
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <Link
        href={routes.projectFraming(projectId)}
        className="w-fit text-xs underline underline-offset-4 hover:text-foreground"
      >
        {t.open}
      </Link>
    </section>
  );
}
