import type { ReactNode } from "react";

import { FactList } from "@/components/ui/fact-list";
import { formatDateTime } from "@/lib/calls/format";
import { fr } from "@/lib/i18n/fr";
import type { CallFormat } from "@/lib/strategy/call-prep";

export type CallRecapData = {
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

/**
 * A prepared exchange as it will be created (Stratégie, Conception), checked
 * before « Créer l'échange ». `extra` adds the facts of its kind (the
 * deliverables of a creative exchange), after the objective.
 */
export function CallRecap({
  id,
  recap,
  extra = [],
}: {
  // Heading id, for aria-labelledby.
  id: string;
  recap: CallRecapData;
  extra?: Array<{ label: string; value: ReactNode }>;
}) {
  const t = fr.calls.prepare;
  const formats = fr.strategyEntry.call.formats;
  const when = new Date(recap.occurredAtLocal);
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 id={id} className="text-body-md font-semibold">
          {t.recap.heading}
        </h3>
        <p className="text-caption text-muted-foreground">{t.recap.body}</p>
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
          { label: t.recap.format, value: formats[recap.format] },
          ...(recap.format === "video" && recap.meetingUrl
            ? [{ label: t.recap.link, value: recap.meetingUrl }]
            : []),
          { label: t.recap.purpose, value: recap.purpose },
          ...extra,
          {
            label: t.recap.participants,
            value: recap.participants.join(", "),
          },
          {
            label: `${t.recap.topics} · ${t.total(recap.minutes)}`,
            value: recap.topics.length ? (
              <ul className="flex flex-col gap-0.5">
                {recap.topics.map((x) => (
                  <li key={x.topic}>
                    {x.topic}{" "}
                    <span className="text-muted-foreground tabular-nums">
                      · {t.minutes(x.minutes)}
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
