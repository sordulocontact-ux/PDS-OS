import { IntentionAddForm } from "@/components/design/intentions/intention-add-form";
import { MergeableProposals } from "@/components/design/work/mergeable-proposals";
import { targetsOf, viewOf } from "@/components/design/work/proposals";
import { ProposalGroup, ProposalRows } from "@/components/ui/proposal-group";
import { KeptIntentionRow } from "@/components/design/intentions/kept-intention-row";
import { routes } from "@/lib/auth/redirects";
import type {
  ConceptionData,
  ConceptionIntention,
} from "@/lib/design/conception";
import { DIRECTION_KEY } from "@/lib/design/intentions";
import { conception } from "@/lib/i18n/fr/conception";
import { designSteps } from "@/lib/i18n/fr/design-steps";
import type { Tone } from "@/lib/ui/state-tones";

const fr = { conception, designSteps };

const t = fr.designSteps.intentions;

/**
 * One group of the Intentions step (proto de1): « Direction de la sortie »
 * or a deliverable — its state (À confirmer, Confirmé, À compléter, Hérite
 * de la direction), « n à confirmer », « Ajouter une intention » on the
 * right, PO's proposals to confirm, correct or set aside (merge and split
 * kept, ticket § 4), then what is confirmed.
 */
export function IntentionGroup({
  projectId,
  data,
  deliverableId,
  title,
  canEdit,
}: {
  projectId: string;
  data: ConceptionData;
  deliverableId: string | null;
  title: string;
  canEdit: boolean;
}) {
  const mine = (i: ConceptionIntention) =>
    deliverableId
      ? i.target === "deliverable" && i.deliverableId === deliverableId
      : i.target === "direction";
  const proposed = data.intentions.filter(
    (i) => mine(i) && i.status === "proposed",
  );
  const confirmed = data.intentions.filter(
    (i) => mine(i) && i.status === "confirmed",
  );
  const status: { tone: Tone; label: string } = proposed.length
    ? { tone: "info", label: t.state.toConfirm }
    : confirmed.length
      ? { tone: "success", label: t.state.confirmed }
      : deliverableId
        ? { tone: "neutral", label: t.state.inherits }
        : { tone: "warning", label: t.state.toComplete };
  const topics = deliverableId
    ? fr.conception.topics
    : fr.conception.directionTopics;
  const sourceOf = (i: ConceptionIntention) =>
    data.sources.find((s) => s.id === i.sourceId) ?? null;
  return (
    <ProposalGroup
      id={`target-${deliverableId ?? DIRECTION_KEY}`}
      title={title}
      status={status}
      toConfirm={proposed.length}
      defaultOpen={proposed.length > 0 || confirmed.length === 0}
      addLabel={t.add}
      addForm={
        canEdit ? (
          <IntentionAddForm
            projectId={projectId}
            deliverableId={deliverableId}
          />
        ) : undefined
      }
      empty={proposed.length + confirmed.length === 0}
      emptyNote={deliverableId ? t.emptyDeliverable : t.emptyDirection}
    >
      {proposed.length > 0 && (
        <MergeableProposals
          projectId={projectId}
          proposals={proposed.map((p) => viewOf(data, p, projectId))}
          canWrite={canEdit}
          target={deliverableId ?? DIRECTION_KEY}
          targets={targetsOf(data)}
        />
      )}
      {confirmed.length > 0 && (
        <ProposalRows>
          {confirmed.map((i) => {
            const source = sourceOf(i);
            return (
              <KeptIntentionRow
                key={i.id}
                proposal={{
                  id: i.id,
                  text: i.value,
                  context: topics[i.topic],
                  quote: i.sourceQuote,
                  from: source?.title ?? null,
                  href: source?.callId
                    ? routes.projectCall(projectId, source.callId)
                    : null,
                  state: "kept",
                }}
              />
            );
          })}
        </ProposalRows>
      )}
    </ProposalGroup>
  );
}
