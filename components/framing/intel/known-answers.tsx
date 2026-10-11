import Link from "next/link";

import { SourceLine } from "@/components/framing/source-line";
import type { DimensionState } from "@/lib/framing/assess";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

/**
 * What the dimension already knows: the project's own facts (owner,
 * validator…) and the questions answered, each with its source. A known
 * answer opens again with « Modifier », or « Voir » once it can't change.
 */
export function KnownAnswers({
  projectId,
  dimension,
  lines,
  current,
  editable,
}: {
  projectId: string;
  dimension: DimensionState;
  // The confirmed lines of each list question, in words.
  lines: Record<string, string[]>;
  // The question open above: not repeated here.
  current: string | null;
  editable: boolean;
}) {
  const t = fr.framingIntel;
  const known = dimension.questions.filter(
    (q) => q.status === "known" && q.key !== current,
  );
  if (known.length === 0 && dimension.facts.length === 0) return null;

  return (
    <section aria-labelledby="known-title" className="flex flex-col gap-3 px-1">
      <h3 id="known-title" className="text-body-md font-semibold">
        {t.guide.knownTitle}
      </h3>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
        {dimension.facts.map((fact) => (
          <div key={fact.label} className="contents">
            <dt className="text-caption text-muted-foreground">{fact.label}</dt>
            <dd className="text-body-md">{fact.value}</dd>
          </div>
        ))}
        {known.map((q) => {
          const items = lines[q.key] ?? [];
          return (
            <div key={q.key} className="contents">
              <dt className="text-caption text-muted-foreground">
                {t.questions[q.key].label}
              </dt>
              <dd className="flex min-w-0 flex-col gap-0.5">
                <span className="text-body-md break-words whitespace-pre-line">
                  {items.length ? items.join(" · ") : q.display}
                </span>
                <SourceLine
                  projectId={projectId}
                  provenance={q.provenance}
                  state="known"
                  confirmed={q.confirmed}
                />
                <span className="flex flex-wrap items-center gap-x-3 text-caption text-muted-foreground">
                  <Link
                    href={routes.projectFramingQuestion(
                      projectId,
                      q.dimension,
                      q.key,
                    )}
                    className="text-foreground underline underline-offset-4"
                  >
                    {editable ? t.guide.modify : t.guide.see}
                  </Link>
                </span>
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
