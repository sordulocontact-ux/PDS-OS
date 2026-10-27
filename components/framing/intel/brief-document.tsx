import { StatusBadge } from "@/components/ui/status-badge";
import {
  requestsAt,
  type BriefRequest,
} from "@/lib/framing/brief-request-view";
import {
  summaryGroups,
  type BriefSnapshot,
} from "@/lib/framing/brief-snapshot";
import {
  DIMENSIONS,
  isQuestionKey,
  type Dimension,
} from "@/lib/framing/dimensions";
import { briefRequests } from "@/lib/i18n/fr/brief-requests";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";
import { briefRequestTone } from "@/lib/ui/state-tones";

const fr = { framingIntel, briefRequests };

/** The validator's requests where they point, in the document itself. */
function RequestNotes({ requests }: { requests: BriefRequest[] }) {
  const t = fr.briefRequests;
  if (requests.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1.5">
      {requests.map((r) => {
        const state = r.resolution ?? "open";
        return (
          <li
            key={r.id}
            className="flex flex-col gap-1 rounded-xl bg-[var(--surface-soft)] px-3 py-2"
          >
            <span className="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
              {t.atQuestion}
              <StatusBadge tone={briefRequestTone[state]} size="sm">
                {t.states[state]}
              </StatusBadge>
            </span>
            <span className="text-body-md break-words whitespace-pre-line">
              {r.body}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * A version of the Brief de cadrage, read as one document: the six
 * dimensions, each answer with its source, then the sources of the Brief.
 * Everything comes from the stored snapshot, never recomputed here.
 */
export function BriefDocument({
  snapshot,
  eyebrow,
  requests = [],
}: {
  snapshot: BriefSnapshot;
  eyebrow: React.ReactNode;
  // Shown where they point (PROJ-UX-06).
  requests?: BriefRequest[];
}) {
  const at = (dimension: Dimension, key: string | null) =>
    requestsAt(requests, dimension, key && isQuestionKey(key) ? key : null);
  const t = fr.framingIntel;
  const groups = summaryGroups(snapshot);
  return (
    <article className="flex flex-col gap-10 rounded-3xl border border-border bg-background p-5 md:p-10">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
          {eyebrow}
        </div>
        <h2 className="text-display-md font-semibold break-words">
          {snapshot.project.title}
        </h2>
        <p className="text-body-md text-muted-foreground">
          {[snapshot.project.kind, snapshot.project.artist]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>

      {groups.length > 0 && (
        <section
          aria-labelledby="brief-summary"
          className="flex flex-col gap-4"
        >
          <h3 id="brief-summary" className="text-display-sm font-semibold">
            {t.summary.title}
          </h3>
          <dl className="grid gap-x-10 gap-y-5 md:grid-cols-2">
            {groups.map(([label, lines]) => (
              <div key={label} className="flex min-w-0 flex-col gap-1">
                <dt className="text-caption text-muted-foreground">{label}</dt>
                <dd>
                  <ul className="flex flex-col gap-0.5 text-body-md font-semibold">
                    {lines.map((line) => (
                      <li key={line} className="break-words">
                        {line}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {DIMENSIONS.map((dimension, index) => {
        const d = snapshot.dimensions.find((x) => x.dimension === dimension);
        if (!d) return null;
        return (
          <section
            key={dimension}
            aria-labelledby={`brief-${dimension}`}
            className="flex flex-col gap-4"
          >
            <h3
              id={`brief-${dimension}`}
              className="text-display-sm font-semibold"
            >
              {t.dimensionNumber(index)} {t.dimensions[dimension]}
            </h3>
            <RequestNotes requests={at(dimension, null)} />
            <dl className="grid gap-x-10 gap-y-5 md:grid-cols-2">
              {d.facts.map((fact) => (
                <div key={fact.label} className="flex flex-col gap-1">
                  <dt className="text-caption text-muted-foreground">
                    {fact.label}
                  </dt>
                  <dd className="text-body-md font-semibold">{fact.value}</dd>
                </div>
              ))}
              {d.items.map((item) => (
                <div key={item.key} className="flex min-w-0 flex-col gap-1">
                  <dt className="text-caption text-muted-foreground">
                    {item.label}
                  </dt>
                  <dd className="flex flex-col gap-1">
                    {item.lines.length > 0 ? (
                      <ul className="flex flex-col gap-0.5 text-body-md font-semibold">
                        {item.lines.map((line) => (
                          <li key={line} className="break-words">
                            {line}
                          </li>
                        ))}
                      </ul>
                    ) : item.value ? (
                      <span className="text-body-md font-semibold break-words whitespace-pre-line">
                        {item.value}
                      </span>
                    ) : (
                      <span className="text-body-md text-muted-foreground">
                        {t.notProvided}
                      </span>
                    )}
                    {item.initial && (
                      <span className="text-caption text-muted-foreground">
                        {item.initial}
                      </span>
                    )}
                    {item.source && (
                      <span className="text-caption text-muted-foreground">
                        {item.source}
                      </span>
                    )}
                    {isQuestionKey(item.key) && (
                      <RequestNotes requests={at(dimension, item.key)} />
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}

      {snapshot.sources.length > 0 && (
        <section
          aria-labelledby="brief-sources"
          className="flex flex-col gap-2"
        >
          <h3 id="brief-sources" className="text-body-md font-semibold">
            {t.brief.sources}
          </h3>
          <p className="text-body-md text-muted-foreground">
            {snapshot.sources.join(" · ")}
          </p>
        </section>
      )}
    </article>
  );
}
