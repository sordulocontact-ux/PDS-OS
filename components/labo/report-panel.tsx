import type { ReactNode } from "react";

import { ProvenanceTag } from "@/components/labo/provenance-tag";
import { StatusBadge } from "@/components/ui/status-badge";
import type { LocatedCallReport } from "@/lib/ai/call-report";
import type { QuoteLocation } from "@/lib/ai/provenance";
import { labo } from "@/lib/i18n/fr/labo";

const fr = { labo };

type Item = {
  key: string;
  main: ReactNode;
  detail?: string;
  at: QuoteLocation;
  quote: string;
};

function Section({ title, items }: { title: string; items: Item[] }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{fr.labo.report.none}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.key}
              className="grid gap-1 border-l-2 border-border pl-3 sm:grid-cols-[1fr_16rem] sm:gap-4"
            >
              <div className="text-sm">
                <p>{item.main}</p>
                {item.detail && (
                  <p className="text-muted-foreground">{item.detail}</p>
                )}
              </div>
              <ProvenanceTag at={item.at} quote={item.quote} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** "quoi — qui · pourquoi", the format required for report lines. */
const line = (what: string, who: string | null, why: string | null) =>
  [what, who && `— ${who}`, why && `· ${why}`].filter(Boolean).join(" ");

export function ReportPanel({ report }: { report: LocatedCallReport }) {
  const t = fr.labo.report;
  const { brief, strategy } = report;
  const field = (
    key: string,
    label: string,
    value: typeof brief.objective,
  ): Item[] =>
    value
      ? [
          {
            key,
            main: (
              <>
                <span className="text-muted-foreground">{label} : </span>
                {value.value}
              </>
            ),
            at: value.at,
            quote: value.quote,
          },
        ]
      : [];

  return (
    <div className="space-y-6">
      <StatusBadge tone="warning" size="sm">
        {t.proposed}
      </StatusBadge>
      <section className="space-y-1">
        <h3 className="text-sm font-medium">{t.summary}</h3>
        <p className="text-sm">{report.summary}</p>
      </section>
      <Section
        title={t.decided}
        items={report.decided.map((x, i) => ({
          key: `d${i}`,
          main: line(x.what, x.who, x.why),
          at: x.at,
          quote: x.quote,
        }))}
      />
      <Section
        title={t.open}
        items={report.open.map((x, i) => ({
          key: `o${i}`,
          main: line(x.what, null, x.why),
          at: x.at,
          quote: x.quote,
        }))}
      />
      <Section
        title={t.nextActions}
        items={report.nextActions.map((x, i) => ({
          key: `a${i}`,
          main: line(x.what, x.who, x.why),
          at: x.at,
          quote: x.quote,
        }))}
      />
      <Section
        title={t.brief}
        items={[
          ...field("objective", t.objective, brief.objective),
          ...field("timing", t.timing, brief.timing),
        ]}
      />
      <Section
        title={t.frame}
        items={brief.frame.map((x, i) => ({
          key: `f${i}`,
          main: x.value,
          at: x.at,
          quote: x.quote,
        }))}
      />
      <Section
        title={t.needs}
        items={brief.needs.map((x, i) => ({
          key: `n${i}`,
          main: x.label,
          detail: t.families[x.family],
          at: x.at,
          quote: x.quote,
        }))}
      />
      <Section
        title={t.team}
        items={brief.team.map((x, i) => ({
          key: `t${i}`,
          main: x.name,
          detail: x.role ?? undefined,
          at: x.at,
          quote: x.quote,
        }))}
      />
      <Section
        title={t.strategy}
        items={[
          ...field("positioning", t.positioning, strategy.positioning),
          ...field("audiences", t.audiences, strategy.audiences),
          ...field("narrative", t.narrative, strategy.narrative),
        ]}
      />
      <Section
        title={t.levers}
        items={strategy.levers.map((x, i) => ({
          key: `l${i}`,
          main: x.label,
          detail: t.families[x.family],
          at: x.at,
          quote: x.quote,
        }))}
      />
    </div>
  );
}
