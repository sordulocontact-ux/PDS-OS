import { FactList } from "@/components/ui/fact-list";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatBriefDate } from "@/lib/framing/assess";
import type { CreativeBriefContent } from "@/lib/design/brief";
import { fr } from "@/lib/i18n/fr";
import { conceptionDeliverableTone } from "@/lib/ui/state-tones";

type Sections = typeof fr.conceptionDirection.brief.sections;

/** One titled part of the Brief; an empty part says so rather than vanish. */
function Part({
  name,
  children,
  empty,
}: {
  name: keyof Sections;
  children?: React.ReactNode;
  empty: boolean;
}) {
  const t = fr.conceptionDirection.brief;
  return (
    <section aria-labelledby={`brief-${name}`} className="flex flex-col gap-2">
      <h3 id={`brief-${name}`} className="text-body-lg font-semibold">
        {t.sections[name]}
      </h3>
      {empty ? (
        <p className="text-body-md text-muted-foreground">{t.none}</p>
      ) : (
        <div className="flex flex-col gap-2 text-body-md">{children}</div>
      )}
    </section>
  );
}

function Lines({ items }: { items: string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1 pl-5">
      {items.map((item, index) => (
        <li key={`${index}-${item}`} className="break-words">
          {item}
        </li>
      ))}
    </ul>
  );
}

/**
 * The Brief créatif global as written by code: the common frame of every
 * deliverable, from the release's context to the points still open. The
 * same view shows a stored version and the live preview.
 */
export function CreativeBriefView({
  content: c,
}: {
  content: CreativeBriefContent;
}) {
  const t = fr.conceptionDirection.brief;
  const topic = (key: keyof typeof fr.conceptionDirection.topics) =>
    fr.conceptionDirection.topics[key];
  return (
    <div className="flex flex-col gap-8">
      <Part name="context" empty={false}>
        <FactList
          facts={[
            { label: t.facts.project, value: c.context.project },
            { label: t.facts.artist, value: c.context.artist || null },
            {
              label: t.facts.release,
              value: c.context.releaseDate
                ? formatBriefDate(c.context.releaseDate)
                : null,
            },
          ]}
          emptyLabel={t.facts.noRelease}
        />
      </Part>
      <Part name="objectives" empty={false}>
        <p className="break-words">{c.objectives.strategic ?? t.toDefine}</p>
      </Part>
      <Part
        name="audiences"
        empty={!c.audiences.audiences && !c.audiences.channels.length}
      >
        {c.audiences.audiences && (
          <p className="break-words">{c.audiences.audiences}</p>
        )}
        {c.audiences.channels.length > 0 && (
          <p className="text-muted-foreground">
            {t.facts.channels} : {c.audiences.channels.join(", ")}
          </p>
        )}
      </Part>
      <Part
        name="narrative"
        empty={!c.narrative.angle && !c.narrative.parts.length}
      >
        {c.narrative.angle && (
          <p className="break-words">{c.narrative.angle}</p>
        )}
        {c.narrative.parts.length > 0 && (
          <Lines items={c.narrative.parts.map((p) => p.value)} />
        )}
      </Part>
      <Part name="principles" empty={!c.principles.length}>
        <Lines items={c.principles} />
      </Part>
      <Part name="tone" empty={!c.tone.length}>
        <Lines items={c.tone} />
      </Part>
      <Part name="showAvoid" empty={!c.showAvoid.length}>
        <Lines items={c.showAvoid} />
      </Part>
      <Part name="coherence" empty={!c.coherence.length}>
        <Lines
          items={c.coherence.map(
            (x) =>
              `${topic(x.topic)} : ${x.value} — ${t.sharedBy(x.deliverables)}`,
          )}
        />
      </Part>
      <Part name="deliverables" empty={!c.deliverables.length}>
        <ul className="flex flex-col gap-3">
          {c.deliverables.map((d, index) => (
            <li key={`${index}-${d.title}`} className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{d.title}</span>
                <StatusBadge
                  tone={conceptionDeliverableTone[d.status]}
                  size="sm"
                >
                  {t.deliverableStatus[d.status]}
                </StatusBadge>
              </div>
              {d.intentions.length > 0 && (
                <Lines
                  items={d.intentions.map(
                    (i) => `${topic(i.topic)} : ${i.value}`,
                  )}
                />
              )}
            </li>
          ))}
        </ul>
      </Part>
      <Part name="references" empty={!c.references.length}>
        <Lines
          items={c.references.map(
            (r) => `${r.label} — ${r.targets.join(", ")}`,
          )}
        />
      </Part>
      <Part name="constraints" empty={!c.constraints.length}>
        <Lines items={c.constraints.map((x) => x.text)} />
      </Part>
      <Part name="decisions" empty={!c.decisions.length}>
        <Lines
          items={c.decisions.map(
            (d) =>
              t.decision(d.version, d.section, d.decision) +
              (d.comment ? ` — ${d.comment}` : ""),
          )}
        />
      </Part>
      <Part name="sources" empty={!c.sources.length}>
        <Lines
          items={c.sources.map((s) =>
            s.kind === "strategy"
              ? s.label
              : `${t.sourceKinds[s.kind]} : ${s.label}`,
          )}
        />
      </Part>
      <Part name="openPoints" empty={!c.openPoints.length}>
        <Lines items={c.openPoints} />
      </Part>
    </div>
  );
}
