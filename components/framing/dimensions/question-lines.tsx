import { ConstraintLines } from "@/components/framing/intel/constraint-lines";
import { DeadlineLines } from "@/components/framing/intel/deadline-lines";
import { ExpenseLines } from "@/components/framing/intel/expense-lines";
import { LineSources } from "@/components/framing/intel/line-sources";
import { NeedsLines } from "@/components/framing/intel/needs-lines";
import { PartyLines } from "@/components/framing/intel/party-lines";
import { TeamLines } from "@/components/framing/intel/team-lines";
import { formatBriefDate, rolesContext } from "@/lib/framing/assess";
import type { QuestionState } from "@/lib/framing/assess";
import type { Provenance } from "@/lib/framing/brief";
import { QUESTIONS } from "@/lib/framing/dimensions";
import type { FramingKnowledge } from "@/lib/framing/knowledge";
import { legalPartyBoard } from "@/lib/framing/legal-parties";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";

const fr = { framingIntel };

/**
 * The lines of a list question, under PO's question (needs, constraints,
 * deadlines, team, legal parties, expenses), and the sources of what was
 * proposed (PROJ-BUG-02). Null for a single-value question.
 */
export function QuestionLines({
  projectId,
  question,
  k,
  editable,
  nextHref,
}: {
  projectId: string;
  question: QuestionState;
  k: FramingKnowledge;
  editable: boolean;
  nextHref: string;
}) {
  const t = fr.framingIntel;
  const common = { projectId, editable, nextHref };
  // Several expenses, recorded in the Budget (PROJ-UX-05).
  if (question.key === "commitments")
    return (
      <ExpenseLines
        projectId={projectId}
        lines={k.budgetLines}
        editable={editable}
      />
    );
  const proposed = <T extends { review_status: string; id: string }>(
    rows: T[],
    label: (row: T) => string,
  ) =>
    rows
      .filter((r) => r.review_status === "proposed")
      .map((r) => ({
        id: r.id,
        label: label(r),
        provenance:
          (r as T & { provenance?: Provenance | null }).provenance ?? null,
      }));
  const kind = QUESTIONS[question.key].kind;
  let body: React.ReactNode = null;
  let sources: Array<{
    id: string;
    label: string;
    provenance: Provenance | null;
  }> = [];
  switch (kind) {
    case "needs":
      body = (
        <NeedsLines
          key={k.framing.needs.map((n) => `${n.id}:${n.review_status}`).join()}
          needs={k.framing.needs}
          {...common}
        />
      );
      sources = proposed(k.framing.needs, (n) => n.label);
      break;
    case "constraints":
    case "rights": {
      const legal = kind === "rights";
      body = (
        <ConstraintLines
          constraints={k.framing.constraints}
          scope={legal ? "legal" : "budget"}
          {...common}
        />
      );
      sources = proposed(
        k.framing.constraints.filter((c) => (c.type === "rights") === legal),
        (c) => c.text,
      );
      break;
    }
    case "deadlines":
      body = <DeadlineLines deadlines={k.deadlines} {...common} />;
      sources = proposed(
        k.deadlines,
        (d) =>
          `${d.kind === "other" && d.label ? d.label : t.deadlineKinds[d.kind as keyof typeof t.deadlineKinds]} · ${d.due_date ? formatBriefDate(d.due_date) : t.guide.deadlines.noDate}`,
      );
      break;
    case "team":
      body = (
        <TeamLines
          team={k.framing.team}
          needs={k.framing.needs}
          music={rolesContext(k).music}
          creatives={k.creatives}
          engineers={k.engineers}
          {...common}
        />
      );
      sources = proposed(k.framing.team, (m) =>
        m.role ? `${m.display_name} (${m.role})` : m.display_name,
      );
      break;
    case "parties": {
      const legacy = k.framing.briefRows.find(
        (r) => r.field_key === question.key && r.status !== "rejected",
      )?.value;
      body = (
        <PartyLines
          board={legalPartyBoard(k)}
          members={k.framing.members}
          legacy={typeof legacy === "string" ? legacy : null}
          {...common}
        />
      );
      break;
    }
    default:
      return null;
  }
  return (
    <>
      {body}
      <LineSources projectId={projectId} items={sources} />
    </>
  );
}
