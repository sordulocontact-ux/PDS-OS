import { Fragment } from "react";

import { FramingLine } from "@/components/framing/framing-line";
import { PartyLines } from "@/components/framing/intel/party-lines";
import { buttonVariants } from "@/components/ui/button";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { VersionCard } from "@/components/ui/version-card";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import type { FramingAssessment, QuestionState } from "@/lib/framing/assess";
import type { LegalPartyBoard } from "@/lib/framing/legal-parties";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";
import { framingJourney } from "@/lib/i18n/fr/framing-journey";
import { framingLineTone } from "@/lib/ui/state-tones";

const fr = { framingIntel, framingJourney };

const open = (q: QuestionState) =>
  q.status !== "known" && q.answer?.kind !== "na" && q.answer?.kind !== "later";

/**
 * The six dimensions at a glance (proto frDims): one folding card each,
 * « 01 · Objectif », « n à traiter » or « Complète », open while something
 * is left; one line per information (value, source, state) and
 * « Répondre » on the open ones but the question asked above (and
 * « Modifier » on the known ones of a dimension reopened by a correction).
 * The legal parties are listed one per line under their line, qualified
 * there while the dimension is open (Sacha 28/10/2026: « je ne trouve pas
 * la qualification des gens dans les 6 »).
 */
export function DimensionCards({
  projectId,
  assessment,
  lines,
  current,
  editable,
  modifiable,
  parties,
}: {
  projectId: string;
  assessment: FramingAssessment;
  lines: Record<string, string[]>;
  current: string | null;
  // Who may answer, dimension by dimension (a correction reopens only some).
  editable: (dimension: string) => boolean;
  // A correction asked: known answers may change too (« Modifier »).
  modifiable: boolean;
  parties: {
    board: LegalPartyBoard;
    members: Array<{ personId: string; name: string }>;
  };
}) {
  const t = fr.framingJourney.dimensions;
  const ti = fr.framingIntel;
  return (
    <div className="flex flex-col gap-3">
      {assessment.dimensions.map((d, index) => {
        const left = d.questions.filter(open).length;
        return (
          <VersionCard
            key={d.dimension}
            id={`dimension-${d.dimension}`}
            defaultOpen={left > 0}
            title={`${ti.dimensionNumber(index)} · ${ti.dimensions[d.dimension]}`}
            status={
              left > 0
                ? { tone: "warning", label: t.toTreat(left) }
                : { tone: "success", label: t.complete }
            }
          >
            <FactRows>
              {d.facts.map((fact) => (
                <FactRow
                  key={fact.label}
                  value={
                    <span>
                      <span className="font-semibold">{fact.label}</span>
                      {" · "}
                      {fact.value}
                    </span>
                  }
                  state={{ tone: framingLineTone.known, label: t.states.known }}
                />
              ))}
              {d.questions.map((q) => {
                // The parties, one per line under their line (not while the
                // question itself is asked above, with the same list).
                const partyList =
                  q.key === "legal_parties" &&
                  q.key !== current &&
                  parties.board.lines.length > 0;
                const line = (
                  <FramingLine
                    key={q.key}
                    question={q}
                    lines={
                      partyList
                        ? [ti.parties.count(parties.board.lines.length)]
                        : (lines[q.key] ?? [])
                    }
                    side={
                      editable(d.dimension) &&
                      q.key !== current &&
                      !partyList &&
                      (open(q) || modifiable) && (
                        <ViewLink
                          href={routes.projectFramingQuestion(
                            projectId,
                            d.dimension,
                            q.key,
                          )}
                          className={buttonVariants({
                            size: "sm",
                            variant: "ghost",
                          })}
                        >
                          {open(q) ? t.answer : ti.guide.modify}
                        </ViewLink>
                      )
                    }
                  />
                );
                if (!partyList) return line;
                return (
                  <Fragment key={q.key}>
                    {line}
                    <div className="border-b border-[color:var(--border-hairline)] px-3.5 last:border-b-0">
                      <PartyLines
                        projectId={projectId}
                        board={parties.board}
                        members={parties.members}
                        legacy={null}
                        editable={editable(d.dimension)}
                      />
                    </div>
                  </Fragment>
                );
              })}
            </FactRows>
          </VersionCard>
        );
      })}
    </div>
  );
}
