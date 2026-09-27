import type { AgendaItem } from "@/lib/calls/first-call-agenda";
import { fr } from "@/lib/i18n/fr";

/** Points to cover and their approximate time, prepared before the call. */
export function CallAgenda({
  agenda,
  durationMinutes,
}: {
  agenda: AgendaItem[];
  durationMinutes: number | null;
}) {
  const t = fr.calls.agenda;
  return (
    <div className="grid gap-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium">{t.title}</h3>
        {durationMinutes !== null && (
          <span className="text-xs text-muted-foreground">
            {t.duration(durationMinutes)}
          </span>
        )}
      </div>
      <ol className="grid list-decimal gap-2 pl-5 text-sm">
        {agenda.map((item, index) => (
          <li key={index} className="flex items-baseline justify-between gap-3">
            <span>{item.topic}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {t.duration(item.minutes)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
