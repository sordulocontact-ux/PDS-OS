import { IconChevronRight } from "nucleo-sharp-essential";
import { Fragment } from "react";

import { FramingLine } from "@/components/framing/framing-line";
import { PartyLines } from "@/components/framing/intel/party-lines";
import { buttonVariants } from "@/components/ui/button";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { StatusBadge } from "@/components/ui/status-badge";
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
 * The six dimensions under the question (proto « Suite du Cadrage », Sacha
 * 29/10/2026): one row each in a single frame, « n à traiter » or
 * « Complète », folded but the dimension of the question asked above. Open,
 * one line per information (value, source, state); the question asked
 * above says « Question en cours » instead of its value. While the step is
 * the viewer's, every line opens in the question box: « Répondre » on what
 * is left, « Modifier » on what is answered (a correction reopens only its
 * dimensions). The legal parties are listed one per line under their line,
 * qualified there while the dimension is open (Sacha 28/10/2026).
 */
export function DimensionRows({
  projectId,
  assessment,
  lines,
  current,
  editable,
  parties,
  header,
}: {
  projectId: string;
  assessment: FramingAssessment;
  lines: Record<string, string[]>;
  // The question asked above, if any.
  current: string | null;
  // Who may answer, dimension by dimension (a correction reopens only some).
  editable: (dimension: string) => boolean;
  parties: {
    board: LegalPartyBoard;
    members: Array<{ personId: string; name: string }>;
  };
  // « Les 6 dimensions » and the dictation beside it (the page's).
  header: React.ReactNode;
}) {
  const t = fr.framingJourney.dimensions;
  const ti = fr.framingIntel;
  return (
    <section aria-labelledby="dimension-rows" className="flex flex-col gap-3">
      {header}
      <div className="overflow-hidden rounded-xl border border-[color:var(--border-hairline)] bg-[var(--surface-page)]">
        {assessment.dimensions.map((d) => {
          const left = d.questions.filter(open).length;
          const asked = d.questions.some((q) => q.key === current);
          return (
            <details
              key={d.dimension}
              id={`dimension-${d.dimension}`}
              open={asked}
              className="group/dim border-t border-[color:var(--border-hairline)] first:border-t-0"
            >
              <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-3 outline-none hover:bg-[var(--control-bg-hover)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--focus-ring)] [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 flex-1 font-medium">
                  {ti.dimensions[d.dimension]}
                </span>
                <StatusBadge tone={left > 0 ? "info" : "success"} size="sm">
                  {left > 0 ? t.toTreat(left) : t.complete}
                </StatusBadge>
                <IconChevronRight className="size-4 shrink-0 text-[color:var(--text-tertiary)] transition-transform duration-[var(--duration-base)] ease-[var(--ease-standard)] group-open/dim:rotate-90 motion-reduce:transition-none" />
              </summary>
              <FactRows className="rounded-none border-0 border-t bg-[var(--surface-soft)]">
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
                    state={{
                      tone: framingLineTone.known,
                      label: t.states.known,
                    }}
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
                      current={q.key === current}
                      lines={
                        partyList
                          ? [ti.parties.count(parties.board.lines.length)]
                          : (lines[q.key] ?? [])
                      }
                      side={
                        editable(d.dimension) &&
                        q.key !== current &&
                        !partyList && (
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
            </details>
          );
        })}
      </div>
    </section>
  );
}
