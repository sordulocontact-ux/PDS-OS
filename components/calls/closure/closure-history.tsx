import { formatDay } from "@/lib/assistant/facts";
import type { CallClosure, CallShare } from "@/lib/calls/closure-queries";
import { calls } from "@/lib/i18n/fr/calls";

const fr = { calls };

/** Every closing and every share of a call's report, newest first. */
export function ClosureHistory({
  closures,
  shares,
}: {
  closures: CallClosure[];
  shares: CallShare[];
}) {
  const t = fr.calls.closure;
  const lines = [
    ...closures.map((c) => ({
      key: c.id,
      at: c.closedAt,
      text:
        t.closedOn(c.version, formatDay(c.closedAt), c.closedByName) +
        (c.note ? ` — ${c.note}` : ""),
    })),
    ...shares.map((s) => ({
      key: s.id,
      at: s.sharedAt,
      text: t.sharedLine(
        s.sharedByName,
        formatDay(s.sharedAt),
        t.scopes[s.scope],
        s.recipients.join(", "),
      ),
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <ul
      aria-label={t.history}
      className="flex flex-col gap-1 text-caption text-[color:var(--text-secondary)]"
    >
      {lines.map((line) => (
        <li key={line.key}>{line.text}</li>
      ))}
    </ul>
  );
}
