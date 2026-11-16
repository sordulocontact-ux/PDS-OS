import { FactRow, FactRows } from "@/components/ui/fact-row";
import { masterSource } from "@/lib/i18n/fr/master-source";
import type {
  SourceStepView,
  SourceTitle,
} from "@/lib/master-workflow/source-step";
import { formatShortDay } from "@/lib/utils/day";

import { MissingStemsRow } from "@/components/master-workflow/round/stems-row";

const fr = { masterSource };

const t = fr.masterSource;

/** « Ce que PDS OS a vérifié » for one title: the mix, the stems (the
 * missing row adds them), the final vocals once declared. */
export function SourceChecked({
  view,
  title,
}: {
  view: SourceStepView;
  title: SourceTitle;
}) {
  const current = title.current;
  return (
    <section className="flex flex-col gap-2.5 modern:gap-2">
      <h3 className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-semibold">
        {t.checked}
      </h3>
      <FactRows>
        <FactRow
          label={t.mix.label}
          value={
            title.mix === "todo" && title.existingMix
              ? t.mix.value.found(title.existingMix.fileName)
              : t.mix.value[title.mix]
          }
          source={t.mix.source}
          state={{
            tone: title.mix === "done" ? "success" : "neutral",
            label: t.mix.state[title.mix],
          }}
        />
        {title.stems.count > 0 ? (
          <FactRow
            label={t.stems.label}
            value={t.stems.value(title.stems.count, title.stems.latest)}
            source={t.stems.source}
            state={{ tone: "success", label: t.stems.ready }}
          />
        ) : (
          // Missing: the row adds them (Ibé's feedback of 02/11).
          <MissingStemsRow
            organizationId={view.organizationId}
            masterId={title.id}
            title={title.title}
            value={t.stems.value(0, null)}
            source={t.stems.source}
            missingLabel={t.stems.missing}
          />
        )}
        {current && current.vocalsFinal !== null && (
          <FactRow
            label={t.vocals.label}
            value={
              current.vocalsFinal
                ? t.vocals.yes
                : t.vocals.no(current.vocalsPending)
            }
            source={t.vocals.source(
              current.confirmedBy,
              formatShortDay(current.confirmedAt),
            )}
            state={
              current.vocalsFinal
                ? { tone: "success", label: t.vocals.ready }
                : { tone: "warning", label: t.vocals.notYet }
            }
          />
        )}
      </FactRows>
    </section>
  );
}
