import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import type { Readiness } from "@/lib/distribution/readiness";
import { fr } from "@/lib/i18n/fr";
import { distributionPreparationTone } from "@/lib/ui/state-tones";

const t = fr.distribution.readiness;

/**
 * Where the preparation stands (ticket § 12: « progression, blocages,
 * prochaine action possible »): blocking elements ready out of all, what
 * blocks, and the first thing to correct, opened in its own module.
 */
export function ReadinessSummary({
  readiness,
  failed,
}: {
  readiness: Readiness;
  failed: boolean;
}) {
  const { ready, total, blockers, next, state } = readiness;
  const summary = t.summary(ready, total);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {t.title}
          <StatusBadge tone={distributionPreparationTone[state]} size="sm">
            {t.preparationStates[state]}
          </StatusBadge>
        </CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="font-medium">{summary}</p>
            <p className="text-sm text-muted-foreground">
              {t.blockingCount(blockers.length)}
            </p>
          </div>
          <ProgressBar value={ready} max={total} label={summary} />
        </div>
        {failed && <ToneCallout tone="danger">{t.failed}</ToneCallout>}
        <div className="grid gap-1">
          <p className="text-sm text-muted-foreground">{t.next}</p>
          {next ? (
            <p className="font-medium break-words">
              <Link
                href={next.href}
                className="underline-offset-4 hover:underline focus-visible:underline"
              >
                {next.label}
                {next.subject ? ` · ${next.subject}` : ""}
              </Link>
              <span className="font-medium text-muted-foreground">
                {" "}
                · {fr.distribution.modules[next.module]} · {next.detail}
              </span>
            </p>
          ) : (
            <p className="font-medium">{t.nextNone}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
