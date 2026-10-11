import { StatusBadge } from "@/components/ui/status-badge";
import { formatDay } from "@/lib/assistant/facts";
import { fr } from "@/lib/i18n/fr";
import type { Clarification } from "@/lib/projects/clarifications";
import { clarificationTone } from "@/lib/ui/state-tones";

/**
 * Each request for clarification of the transmission, structured (PROJ-UX-02):
 * subject, question and who asked, the director's reply and when. Kept after
 * the project is accepted: the budget question and its answer stay readable.
 */
export function ClarificationList({ items }: { items: Clarification[] }) {
  const t = fr.transmission.clarifications;
  if (items.length === 0) return null;
  return (
    <section
      aria-labelledby="clarifications-title"
      className="flex flex-col gap-3"
    >
      <h2 id="clarifications-title" className="text-base font-medium">
        {t.title}
      </h2>
      <ol className="flex flex-col gap-3">
        {items.map((c) => (
          <li
            key={c.id}
            className="flex flex-col gap-2 rounded-xl border border-border px-4 py-3 text-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">
                {c.subject
                  ? fr.transmission.subjects[c.subject]
                  : fr.transmission.subjects.other}
              </span>
              <StatusBadge tone={clarificationTone[c.status]} size="sm">
                {t.statuses[c.status]}
              </StatusBadge>
            </div>
            <dl className="grid gap-2 sm:grid-cols-[6rem_minmax(0,1fr)]">
              <dt className="text-xs text-muted-foreground">{t.question}</dt>
              <dd className="flex flex-col gap-0.5">
                <span className="whitespace-pre-line">
                  {c.question ?? t.hidden}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t.asked(c.author, c.askedAt ? formatDay(c.askedAt) : "—")}
                </span>
              </dd>
              {c.status !== "waiting" && (
                <>
                  <dt className="text-xs text-muted-foreground">{t.answer}</dt>
                  <dd className="flex flex-col gap-0.5">
                    <span className="whitespace-pre-line">
                      {c.answer ??
                        (c.status === "retransmitted"
                          ? t.statuses.retransmitted
                          : t.hidden)}
                    </span>
                    {c.answeredBy && c.answeredAt && (
                      <span className="text-xs text-muted-foreground">
                        {t.answeredBy(c.answeredBy, formatDay(c.answeredAt))}
                      </span>
                    )}
                  </dd>
                </>
              )}
            </dl>
          </li>
        ))}
      </ol>
    </section>
  );
}
