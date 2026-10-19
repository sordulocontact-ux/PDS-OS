import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import type { Demarche } from "@/lib/legal/demarches/build";

const t = fr.legalDemarches.proposed;

/**
 * A démarche the code proposes while the plan is not launched (proto
 * « Projet complet »): why it starts later, then what will come, gesture by
 * gesture, with who makes each one.
 */
export function ProposedDemarche({ demarche }: { demarche: Demarche }) {
  const gestures = t.gestures[demarche.kind] ?? [];
  const who = (by: string) =>
    by === "them" ? demarche.subject : (t.who[by] ?? t.owner);
  return (
    <div className="flex flex-col gap-3.5">
      <ToneCallout tone="info">{t.note}</ToneCallout>
      <section className="flex flex-col gap-2" aria-label={t.comes}>
        <h3 className="text-[length:var(--type-body-sm)] font-semibold text-[color:var(--text-secondary)]">
          {t.comes}
        </h3>
        <ol className="flex flex-col gap-1.5 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)]">
          {gestures.map(([by, label], index) => (
            <li key={label} className="flex flex-wrap gap-x-2">
              <span className="font-medium">
                {index + 1}. {label}
              </span>
              <span className="text-[color:var(--text-secondary)]">
                {who(by)}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
