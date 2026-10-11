import Link from "next/link";

import { labelClass } from "@/components/ui/option-class";
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
  const filled = brief;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className={labelClass}>{t.title}</h3>
        {/* Validated is the normal case here: only the exception is marked. */}
        {!validated && (
          <StatusBadge tone="warning" size="sm">
            {t.notValidated}
          </StatusBadge>
        )}
      </div>
      {filled.length === 0 ? (
        <p className="text-body-md text-muted-foreground">{t.empty}</p>
      ) : (
        <dl className="flex flex-col gap-3">
          {filled.map((field) => (
            <div key={field.key} className="flex flex-col gap-0.5">
              <dt className="text-caption text-muted-foreground">
                {field.label}
              </dt>
              <dd className="line-clamp-4 text-body-md whitespace-pre-wrap">
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <Link
        href={routes.projectFraming(projectId)}
        className="w-fit text-caption underline underline-offset-4"
      >
        {t.open}
      </Link>
    </section>
  );
}
