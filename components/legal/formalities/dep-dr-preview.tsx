import { ToneCallout } from "@/components/ui/tone-callout";
import { legalFormalities } from "@/lib/i18n/fr/legal-formalities";
import type {
  Creator,
  PhonoSplit,
  Publisher,
} from "@/lib/legal/formalities/definition";
import {
  bulletinShares,
  creatorName,
} from "@/lib/legal/formalities/participants";
import {
  sharingPreview,
  type SharingAlert,
} from "@/lib/legal/formalities/sharing-rule";
import { formatShare, shareOf } from "@/lib/legal/splits/shares";

const fr = { legalFormalities };

/**
 * « Aperçu des DEP et DR » under the rubrique D (JUR-23): what each right
 * holder gets of the DEP and DR with the choice made, the effect of the
 * other choice line by line, the alerts, the rule and its version, and that
 * a person confirms it. Computed by the code at every change.
 */
export function DepDrPreview({
  creators,
  publishers,
  split,
  choice,
  ruleId,
}: {
  creators: Creator[];
  publishers: Publisher[];
  split: PhonoSplit;
  choice: string;
  ruleId: string;
}) {
  const t = fr.legalFormalities.sharing;
  // One line per role of the bulletin, its Phono share derived from the
  // categories (retour d'Ibé du 02/11/2026).
  const derived = bulletinShares(creators, publishers, split);
  const people = {
    creators: creators.flatMap((c, i) =>
      derived.creators[i].map((line) => ({
        name: creatorName(c) || "—",
        quality: line.quality,
        phono: shareOf(line.phono),
      })),
    ),
    publishers: publishers.map((p, i) => ({
      name: p.name || "—",
      phono: shareOf(derived.publishers[i]),
    })),
    ruleId,
  };
  const follow = choice === "follow_phono";
  const shown = sharingPreview({ ...people, followPhono: follow });
  const other = sharingPreview({ ...people, followPhono: !follow });
  if (shown.lines.length === 0) return null;
  const share = (units: number | null) =>
    units === null ? t.notComputed : formatShare(units);
  const effects = shown.lines.flatMap((line, i) => {
    const o = other.lines[i];
    return [
      ...(line.dep !== o.dep
        ? [t.effect(line.name, t.columns.dep, share(line.dep), share(o.dep))]
        : []),
      ...(line.dr !== o.dr
        ? [t.effect(line.name, t.columns.dr, share(line.dr), share(o.dr))]
        : []),
    ];
  });
  const quality = (q: string) =>
    q === "publisher"
      ? t.publisher
      : (fr.legalFormalities.qualities as Record<string, string>)[q] || "—";

  return (
    <section
      aria-labelledby="dep-dr-preview"
      className="flex flex-col gap-3 rounded-2xl border border-border p-4"
    >
      <h4 id="dep-dr-preview" className="text-body-md font-semibold">
        {t.title}
      </h4>
      <p className="text-sm text-muted-foreground">{t.intro}</p>
      {shown.alerts.map((alert, i) => (
        <ToneCallout key={i} tone="warning">
          {alertText(alert, quality)}
        </ToneCallout>
      ))}
      <div className="overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1.5 pr-3 font-medium">{t.columns.name}</th>
              <th className="py-1.5 pr-3 font-medium">{t.columns.category}</th>
              <th className="py-1.5 pr-3 text-right font-medium">
                {t.columns.phono}
              </th>
              <th className="py-1.5 pr-3 text-right font-medium">
                {t.columns.dep}
              </th>
              <th className="py-1.5 text-right font-medium">{t.columns.dr}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {shown.lines.map((line, i) => (
              <tr key={i}>
                <td className="py-1.5 pr-3 font-medium break-words">
                  {line.name}
                </td>
                <td className="py-1.5 pr-3">{quality(line.quality)}</td>
                <td className="py-1.5 pr-3 text-right">{share(line.phono)}</td>
                <td className="py-1.5 pr-3 text-right">{share(line.dep)}</td>
                <td className="py-1.5 text-right">{share(line.dr)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{t.effectTitle}</p>
        {effects.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.effectNone}</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{t.effectIntro}</p>
            <ul className="flex list-disc flex-col gap-0.5 pl-5 text-sm tabular-nums">
              {effects.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </>
        )}
      </div>
      <p className="text-caption text-muted-foreground">
        {shown.rule ? `${t.rule(shown.rule.source)} ` : ""}
        {t.confirm}
      </p>
    </section>
  );
}

function alertText(
  alert: SharingAlert,
  quality: (q: string) => string,
): string {
  const a = fr.legalFormalities.sharing.alerts;
  switch (alert.kind) {
    case "phono_total":
      return a.phono_total(formatShare(alert.total));
    case "empty_category":
      return a.empty_category(
        fr.legalFormalities.sharing.categories[alert.category],
      );
    case "not_covered":
      return a.not_covered(alert.name, quality(alert.quality));
    case "unknown_rule":
      return a.unknown_rule;
  }
}
