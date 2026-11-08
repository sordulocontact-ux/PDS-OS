import { Fragment } from "react";

import { ConfirmDimension } from "@/components/framing/dimensions/confirm-dimension";
import { FramingLine } from "@/components/framing/framing-line";
import { PartyLines } from "@/components/framing/intel/party-lines";
import { DimensionItem, DimensionList } from "@/components/ui/dimension-list";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { routes } from "@/lib/auth/redirects";
import type { FramingAssessment, QuestionState } from "@/lib/framing/assess";
import type { Dimension } from "@/lib/framing/dimensions";
import type { LegalPartyBoard } from "@/lib/framing/legal-parties";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";
import { framingJourney } from "@/lib/i18n/fr/framing-journey";
import { framingLineTone } from "@/lib/ui/state-tones";

const fr = { framingIntel, framingJourney };

const open = (q: QuestionState) =>
  q.status !== "known" && q.answer?.kind !== "na" && q.answer?.kind !== "later";

/**
 * The six dimensions under the question (proto « Suite du Cadrage », Sacha
 * 29/10/2026): one row each in a single frame (`DimensionList`), folded but
 * the dimension of the question asked above and the first one with
 * proposals to check. Open, one line per information (value, source,
 * state); the question asked above says « Question en cours » instead of
 * its value. While the step is the viewer's, PO's proposals read « À
 * vérifier » and are confirmed together under their dimension
 * (« Confirmer les n »); every line opens in the question box with a click
 * on it, no « Modifier » beside it (a correction reopens only its
 * dimensions). For the others, « n à traiter » or « Complète ». The legal
 * parties are listed one per line under their line, qualified there while
 * the dimension is open (Sacha 28/10/2026).
 */
export function DimensionRows({
  projectId,
  assessment,
  lines,
  current,
  editable,
  parties,
  header,
  verify,
  openFirst,
  lastDimension,
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
  // PO's proposals checked here rather than asked (lib/framing/verify.ts).
  verify: string[];
  // Open from the start: the first dimension with proposals to check.
  openFirst: Dimension | null;
  // Its proposals are all that is left: confirming them opens the Brief.
  lastDimension: Dimension | null;
}) {
  const t = fr.framingJourney.dimensions;
  const ti = fr.framingIntel;
  return (
    <DimensionList labelledBy="dimension-rows" header={header}>
      {assessment.dimensions.map((d) => {
        const mine = editable(d.dimension);
        const checked = mine
          ? d.questions.filter((q) => verify.includes(q.key))
          : [];
        const left = d.questions.filter(
          (q) => open(q) && !checked.includes(q),
        ).length;
        const asked = d.questions.some((q) => q.key === current);
        return (
          <DimensionItem
            key={d.dimension}
            id={`dimension-${d.dimension}`}
            name={ti.dimensions[d.dimension]}
            open={asked || d.dimension === openFirst}
            mark={checked.length > 0 ? "current" : left > 0 ? "todo" : "done"}
            badges={[
              checked.length > 0 && {
                tone: "info",
                label: t.toVerify(checked.length),
              },
              left > 0 && {
                tone: mine ? "warning" : "info",
                label: mine ? t.questions(left) : t.toTreat(left),
              },
              checked.length === 0 &&
                left === 0 && { tone: "success", label: t.complete },
            ]}
            footer={
              checked.length > 0 && (
                <ConfirmDimension
                  projectId={projectId}
                  dimension={d.dimension}
                  name={ti.dimensions[d.dimension]}
                  count={checked.length}
                  briefHref={
                    lastDimension === d.dimension
                      ? routes.projectFramingStep(projectId, "brief")
                      : null
                  }
                />
              )
            }
          >
            <FactRows className="rounded-none border-0">
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
                const opens = mine && q.key !== current && !partyList;
                const line = (
                  <FramingLine
                    key={q.key}
                    question={q}
                    current={q.key === current}
                    verify={checked.includes(q)}
                    lines={
                      partyList
                        ? [ti.parties.count(parties.board.lines.length)]
                        : (lines[q.key] ?? [])
                    }
                    href={
                      opens
                        ? routes.projectFramingQuestion(
                            projectId,
                            d.dimension,
                            q.key,
                          )
                        : null
                    }
                    hrefLabel={t.open(ti.questions[q.key].label)}
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
                        editable={mine}
                      />
                    </div>
                  </Fragment>
                );
              })}
            </FactRows>
          </DimensionItem>
        );
      })}
    </DimensionList>
  );
}
