import { MergeableProposals } from "@/components/design/work/mergeable-proposals";
import type { ProposalView } from "@/components/design/work/conception-proposal-row";
import { ProposalGroup } from "@/components/ui/proposal-group";
import { routes } from "@/lib/auth/redirects";
import type {
  ConceptionData,
  ConceptionIntention,
} from "@/lib/design/conception";
import { DIRECTION_KEY } from "@/lib/design/intentions";
import type { Provenance } from "@/lib/framing/brief";
import { fr } from "@/lib/i18n/fr";

type Data = Pick<
  ConceptionData,
  "deliverables" | "intentions" | "sources" | "canWrite"
>;

const placeOf = (i: ConceptionIntention) =>
  i.target === "deliverable" ? i.deliverableId : i.target;

/**
 * A proposal as shown, with what the code can say about it: where it comes
 * from, which other targets the same passage feeds (one source, never
 * copied), whether it would replace an answer already confirmed.
 */
function viewOf(
  data: Data,
  proposal: ConceptionIntention,
  projectId: string,
): ProposalView {
  const t = fr.conceptionWork.proposals;
  const labelOf = (place: string | null) =>
    place === DIRECTION_KEY
      ? fr.conceptionWork.targets.direction
      : (data.deliverables.find((d) => d.id === place)?.title ?? null);
  const source = data.sources.find((s) => s.id === proposal.sourceId);
  const quote = proposal.sourceQuote ?? "";
  const provenance: Provenance =
    source?.kind === "call"
      ? {
          kind: "call",
          quote,
          located: "found",
          startSeconds: null,
          callId: source.callId,
          callTitle: source.title,
        }
      : {
          kind: "record",
          label: source ? t.fromImport(source.title) : t.unknownSource,
          quote,
        };
  const alsoFor = [
    ...new Set(
      data.intentions
        .filter(
          (i) =>
            i.id !== proposal.id &&
            i.target !== "unassigned" &&
            i.sourceId === proposal.sourceId &&
            i.sourceQuote === proposal.sourceQuote &&
            placeOf(i) !== placeOf(proposal),
        )
        .flatMap((i) => labelOf(placeOf(i)) ?? []),
    ),
  ];
  const differs =
    proposal.target !== "unassigned" &&
    data.intentions.some(
      (i) =>
        i.status === "confirmed" &&
        i.topic === proposal.topic &&
        placeOf(i) === placeOf(proposal),
    );
  const topics =
    proposal.target === "direction"
      ? fr.conception.directionTopics
      : fr.conception.topics;
  return {
    id: proposal.id,
    value: proposal.value,
    topic: proposal.topic,
    topicLabel: topics[proposal.topic],
    provenance,
    callHref:
      source?.kind === "call" && source.callId
        ? routes.projectCall(projectId, source.callId)
        : null,
    alsoFor,
    differs,
  };
}

/** Every place a proposal can be attached to: the direction, each deliverable. */
function targetsOf(data: Data): Record<string, string> {
  return {
    [DIRECTION_KEY]: fr.conceptionWork.targets.direction,
    ...Object.fromEntries(data.deliverables.map((d) => [d.id, d.title])),
  };
}

/** PO's proposals for the target open in the work. */
export function TargetProposals({
  data,
  projectId,
  deliverableId,
}: {
  data: Data;
  projectId: string;
  // Null: the overall direction.
  deliverableId: string | null;
}) {
  const t = fr.conceptionWork.proposals;
  const proposals = data.intentions.filter(
    (i) =>
      i.status === "proposed" &&
      (deliverableId
        ? i.target === "deliverable" && i.deliverableId === deliverableId
        : i.target === "direction"),
  );
  if (proposals.length === 0) return null;
  return (
    <ProposalGroup
      id="design-proposals"
      title={t.title}
      note={t.hint}
      toConfirm={proposals.length}
    >
      <MergeableProposals
        projectId={projectId}
        proposals={proposals.map((p) => viewOf(data, p, projectId))}
        canWrite={data.canWrite}
        target={deliverableId ?? DIRECTION_KEY}
        targets={targetsOf(data)}
      />
    </ProposalGroup>
  );
}

/** Proposals PO could not place, whatever the target: attached here. */
export function UnassignedProposals({
  data,
  projectId,
}: {
  data: Data;
  projectId: string;
}) {
  const t = fr.conceptionWork.unassigned;
  const proposals = data.intentions.filter(
    (i) => i.status === "proposed" && i.target === "unassigned",
  );
  if (proposals.length === 0) return null;
  const targets = targetsOf(data);
  return (
    <ProposalGroup
      id="design-unassigned"
      title={t.title}
      note={t.hint}
      toConfirm={proposals.length}
    >
      <MergeableProposals
        projectId={projectId}
        proposals={proposals.map((p) => viewOf(data, p, projectId))}
        canWrite={data.canWrite}
        target=""
        targets={targets}
        attachTargets={targets}
      />
    </ProposalGroup>
  );
}
