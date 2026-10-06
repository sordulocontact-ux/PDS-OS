import type { BriefSnapshot } from "@/lib/framing/brief-snapshot";
import { DIMENSIONS } from "@/lib/framing/dimensions";
import { fr } from "@/lib/i18n/fr";

/**
 * A version of the Brief de cadrage, read as one document: the six
 * dimensions, each answer with its source, then the sources of the Brief.
 * Everything comes from the stored snapshot, never recomputed here.
 */
export function BriefDocument({
  snapshot,
  eyebrow,
}: {
  snapshot: BriefSnapshot;
  eyebrow: React.ReactNode;
}) {
  const t = fr.framingIntel;
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
                    {item.source && (
                      <span className="text-caption text-muted-foreground">
                        {item.source}
                      </span>
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
