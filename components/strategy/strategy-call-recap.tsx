import { FactList } from "@/components/ui/fact-list";
import { formatDateTime } from "@/lib/calls/format";
import { fr } from "@/lib/i18n/fr";
import type { CallFormat } from "@/lib/strategy/call-prep";

export type CallRecap = {
  title: string;
  // "YYYY-MM-DDTHH:mm", the browser's zone (as typed).
  occurredAtLocal: string;
  format: CallFormat;
  meetingUrl: string;
  purpose: string;
  participants: string[];
  topics: Array<{ topic: string; minutes: number }>;
  minutes: number;
};

/** The exchange as it will be created, checked before « Créer l'échange ». */
export function StrategyCallRecap({ recap }: { recap: CallRecap }) {
  const t = fr.strategyEntry.call;
  const prepare = fr.calls.prepare;
  const when = new Date(recap.occurredAtLocal);
  return (
    <section
      aria-labelledby="strategy-call-recap"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <h3 id="strategy-call-recap" className="text-body-md font-semibold">
          {t.recapTitle}
        </h3>
        <p className="text-caption text-muted-foreground">{t.recapBody}</p>
      </div>
      <FactList
        facts={[
          { label: t.recap.title, value: recap.title },
          {
            label: t.recap.when,
            value: Number.isNaN(when.getTime())
              ? null
              : formatDateTime(when.toISOString()),
          },
          { label: t.recap.format, value: t.formats[recap.format] },
          ...(recap.format === "video" && recap.meetingUrl
            ? [{ label: t.recap.link, value: recap.meetingUrl }]
            : []),
          { label: t.recap.purpose, value: recap.purpose },
          {
            label: t.recap.participants,
            value: recap.participants.join(", "),
          },
          {
            label: `${t.recap.topics} · ${prepare.total(recap.minutes)}`,
            value: recap.topics.length ? (
              <ul className="flex flex-col gap-0.5">
                {recap.topics.map((x) => (
                  <li key={x.topic}>
                    {x.topic}{" "}
                    <span className="text-muted-foreground tabular-nums">
                      · {prepare.minutes(x.minutes)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null,
          },
        ]}
        emptyLabel={t.recap.none}
      />
    </section>
  );
}
