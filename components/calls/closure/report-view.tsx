import type { ReportContent } from "@/lib/calls/closure";
import { MarkedText } from "@/components/ui/marked-text";
import { formatBriefDate } from "@/lib/framing/assess";
import { calls } from "@/lib/i18n/fr/calls";

const fr = { calls };

/** A closed report as it reads (PROJ-AMEL-01): never the transcription. */
export function ReportView({ content }: { content: ReportContent }) {
  const t = fr.calls.closure.report;
  const block = (title: string, items: string[]) =>
    items.length > 0 && (
      <section className="flex flex-col gap-1.5">
        <h4 className="text-body-md font-semibold">{title}</h4>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-body-md">
          {items.map((item, i) => (
            <li key={i} className="break-words">
              <MarkedText text={item} />
            </li>
          ))}
        </ul>
      </section>
    );
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-1.5">
        <h4 className="text-body-md font-semibold">{t.summary}</h4>
        <p className="text-body-md whitespace-pre-wrap">
          <MarkedText text={content.summary} />
        </p>
      </section>
      {block(
        t.decisions,
        content.decisions.map((d) => `${d.what}${d.who ? ` (${d.who})` : ""}`),
      )}
      {block(
        t.actions,
        content.actions.map(
          (a) =>
            `${a.what}${
              a.assigneeName
                ? ` — ${a.assigneeName}${a.dueDate ? `, ${t.due(formatBriefDate(a.dueDate))}` : ""}`
                : a.who
                  ? ` — ${a.who}`
                  : ""
            }`,
        ),
      )}
      {block(
        t.open,
        content.open.map((o) => o.what),
      )}
    </div>
  );
}
