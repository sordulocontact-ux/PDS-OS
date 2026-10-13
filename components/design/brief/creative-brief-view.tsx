import { BriefDeliverablesPart } from "@/components/design/brief/brief-deliverables-part";
import { BriefIdentitySection } from "@/components/design/brief/brief-identity-section";
import { Lines, Part } from "@/components/design/brief/brief-part";
import { FactList } from "@/components/ui/fact-list";
import { ViewLink } from "@/components/ui/view-link";
import type { CreativeBriefContent } from "@/lib/design/brief";
import {
  coherenceLine,
  decisionLine,
  referenceLine,
} from "@/lib/design/brief-text";
import { formatBriefDate } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";

/**
 * The Brief créatif global as written by code: the common frame of every
 * deliverable, from the release's context to the points still open. The
 * same view shows a stored version and the live preview.
 */
export function CreativeBriefView({
  content: c,
  callLinks,
}: {
  content: CreativeBriefContent;
  // A call source's page, by its title (MKT-C2-05: from the Brief back to
  // the call it comes from).
  callLinks?: Record<string, string>;
}) {
  const t = fr.conceptionDirection.brief;
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
      {c.identity && <BriefIdentitySection identity={c.identity} />}
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
        <Lines items={c.coherence.map(coherenceLine)} />
      </Part>
      <BriefDeliverablesPart
        deliverables={c.deliverables}
        excluded={c.excluded ?? []}
      />
      <Part name="references" empty={!c.references.length}>
        <Lines items={c.references.map(referenceLine)} />
      </Part>
      <Part name="constraints" empty={!c.constraints.length}>
        <Lines items={c.constraints.map((x) => x.text)} />
      </Part>
      <Part name="decisions" empty={!c.decisions.length}>
        <Lines items={c.decisions.map(decisionLine)} />
      </Part>
      <Part name="sources" empty={!c.sources.length}>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          {c.sources.map((s, index) => {
            const label =
              s.kind === "strategy"
                ? s.label
                : `${t.sourceKinds[s.kind]} : ${s.label}`;
            const href = s.kind === "call" ? callLinks?.[s.label] : undefined;
            return (
              <li key={`${index}-${s.label}`} className="break-words">
                {href ? (
                  <ViewLink
                    href={href}
                    className="underline underline-offset-2"
                  >
                    {label}
                  </ViewLink>
                ) : (
                  label
                )}
              </li>
            );
          })}
        </ul>
      </Part>
      <Part name="openPoints" empty={!c.openPoints.length}>
        <Lines items={c.openPoints} />
      </Part>
    </div>
  );
}
