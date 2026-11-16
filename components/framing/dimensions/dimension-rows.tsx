import { Fragment } from "react";

import { ConfirmDimension } from "@/components/framing/dimensions/confirm-dimension";
import { FramingLine, LineColumns } from "@/components/framing/framing-line";
import { PartyLines } from "@/components/framing/intel/party-lines";
import { ResultLine } from "@/components/shell/module/result-banner";
import { DimensionItem, DimensionList } from "@/components/ui/dimension-list";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { routes } from "@/lib/auth/redirects";
import type { FramingAssessment } from "@/lib/framing/assess";
import type { Dimension } from "@/lib/framing/dimensions";
import type { LegalPartyBoard } from "@/lib/framing/legal-parties";
import { isLineOpen } from "@/lib/framing/lines";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";
import { framingJourney } from "@/lib/i18n/fr/framing-journey";

const fr = { framingIntel, framingJourney };

/**
 * The six dimensions under PO's question (proto « Les dimensions », Sacha
 * 09/11/2026), under « Avancement »: one card each (`DimensionList`), folded
 * but the one of the question asked above, of the line opened, and the
 * first one with proposals to check. A dimension says where it stands in
 * grey words (« 2 à vérifier · 1 à répondre », « Complète »), a dot when
 * something there is the viewer's. Open, one line per information (label
 * and value in two columns, source, only what it still needs on its right).
 * While the step is the viewer's, PO's proposals read « À vérifier » and are
 * confirmed together under their dimension (« Confirmer les n »); a click
 * on a line opens it in place, under itself (`line`), the page staying
 * still, PO's box keeping its question (`box`); its confirmation is said in
 * the dimension (ResultLine). For the others, « n à traiter » or
 * « Complète ». The legal parties are listed one per line under their
 * line, qualified there while the dimension is open (Sacha 28/10/2026).
 */
export function DimensionRows({
  projectId,
  assessment,
  lines,
  box,
  line,
  keepOpen,
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
  // The question in PO's box above, if any.
  box: string | null;
  // The line opened in place, and its question (QuestionScreen inline).
  line: { key: string; node: React.ReactNode } | null;
  // Left open after a gesture made in it (`?d=`).
  keepOpen: string | null;
  // Who may answer, dimension by dimension (a correction reopens only some).
  editable: (dimension: string) => boolean;
  parties: {
    board: LegalPartyBoard;
    members: Array<{ personId: string; name: string }>;
  };
  // « Avancement » and the dictation beside it (the page's).
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
          (q) => isLineOpen(q) && !checked.includes(q),
        ).length;
        const has = (key: string | null) =>
          d.questions.some((q) => q.key === key);
        const at = `dimension-${d.dimension}`;
        const state =
          [
            checked.length > 0 && t.toVerify(checked.length),
            left > 0 && (mine ? t.toAnswer(left) : t.toTreat(left)),
          ]
            .filter(Boolean)
            .join(" · ") || t.complete;
        return (
          <DimensionItem
            key={d.dimension}
            id={at}
            name={ti.dimensions[d.dimension]}
            open={
              has(box) ||
              has(line?.key ?? null) ||
              d.dimension === keepOpen ||
              d.dimension === openFirst
            }
            mark={checked.length > 0 ? "current" : left > 0 ? "todo" : "done"}
            state={{
              label: state,
              mine: mine && (checked.length > 0 || left > 0),
            }}
            footer={
              <>
                <ResultLine
                  at={at}
                  className="border-t border-[color:var(--border-hairline)] px-3.5 py-3 modern:px-3"
                />
                {checked.length > 0 && (
                  <ConfirmDimension
                    projectId={projectId}
                    dimension={d.dimension}
                    name={ti.dimensions[d.dimension]}
                    count={checked.length}
                    at={at}
                    briefHref={
                      lastDimension === d.dimension
                        ? routes.projectFramingStep(projectId, "brief")
                        : null
                    }
                  />
                )}
              </>
            }
          >
            <FactRows className="rounded-none border-0">
              {d.facts.map((fact) => (
                <FactRow
                  key={fact.label}
                  value={<LineColumns label={fact.label} value={fact.value} />}
                />
              ))}
              {d.questions.map((q) => {
                const opened = line?.key === q.key;
                // The parties, one per line under their line (not while the
                // line is open, its question bringing the same list).
                const partyList =
                  q.key === "legal_parties" &&
                  !opened &&
                  parties.board.lines.length > 0;
                const opens = mine && !partyList;
                const row = (
                  <FramingLine
                    key={q.key}
                    question={q}
                    verify={checked.includes(q)}
                    mine={mine}
                    open={opened}
                    lines={
                      partyList
                        ? [ti.parties.count(parties.board.lines.length)]
                        : (lines[q.key] ?? [])
                    }
                    href={
                      !opens
                        ? null
                        : opened
                          ? routes.projectFramingLine(
                              projectId,
                              null,
                              box,
                              d.dimension,
                            )
                          : routes.projectFramingLine(
                              projectId,
                              q.key,
                              box === q.key ? null : box,
                            )
                    }
                    hrefLabel={
                      opened ? t.close : t.open(ti.questions[q.key].label)
                    }
                  />
                );
                if (opened)
                  return (
                    <Fragment key={q.key}>
                      {row}
                      {line?.node}
                    </Fragment>
                  );
                if (!partyList) return row;
                return (
                  <Fragment key={q.key}>
                    {row}
                    <div className="border-b border-[color:var(--border-hairline)] px-3.5 py-3.5 last:border-b-0 modern:px-3 modern:py-3">
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
