import { ToneCallout } from "@/components/ui/tone-callout";
import type { BriefChecks } from "@/lib/design/brief-checks";
import { fr } from "@/lib/i18n/fr";

/**
 * What the dossier lacks, said before a version is made (MKT-C2-12): what
 * blocks it, what goes in with a reserve, what is left out.
 */
export function BriefChecksList({ checks }: { checks: BriefChecks }) {
  const t = fr.conceptionDirection.brief.checks;
  const groups = [
    { title: t.blockingTitle, items: checks.blocking, tone: "danger" },
    { title: t.reservedTitle, items: checks.reserved, tone: "warning" },
    { title: t.excludedTitle, items: checks.excluded, tone: "neutral" },
  ] as const;
  if (groups.every((g) => !g.items.length))
    return <ToneCallout tone="success">{t.none}</ToneCallout>;
  return (
    <section aria-label={t.title} className="flex flex-col gap-3">
      <h3 className="text-body-lg font-semibold">{t.title}</h3>
      {groups.map(
        (g) =>
          g.items.length > 0 && (
            <ToneCallout key={g.title} as="div" tone={g.tone}>
              <span className="font-semibold">{g.title}</span>
              <ul className="mt-1 flex list-disc flex-col gap-1 pl-5">
                {g.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </ToneCallout>
          ),
      )}
    </section>
  );
}
