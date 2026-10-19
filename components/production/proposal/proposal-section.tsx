import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import { proposalState } from "@/lib/production/proposal/model";
import { loadProposalVersions } from "@/lib/production/proposal/queries";
import type { ProductionSheetData } from "@/lib/production/sheet";
import { formatShortInstant } from "@/lib/utils/day";

import { ProposalDecision } from "./proposal-decision";
import { ProposalDepositForm } from "./proposal-deposit-form";
import { ProposalRequestForm } from "./proposal-request-form";
import { ProposalVersions } from "./proposal-versions";

const t = fr.productionProposal;

/**
 * « Proposition de réalisation » of an external production in versions
 * (proto BODY.creative, PR-11): the version retained and what is asked
 * since, the versions, then the viewer's own gesture — decide the latest
 * as the internal creative validation, deposit a version when the director
 * has an account, ask for a new version once one is retained.
 */
export async function ProposalSection({
  projectId,
  data,
  viewerId,
  canReview,
}: {
  projectId: string;
  data: ProductionSheetData;
  viewerId: string | null;
  canReview: boolean;
}) {
  const sheet = data.sheet;
  if (!sheet) return null;
  const versions = await loadProposalVersions(sheet.id);
  const revision = sheet.directionRevision;
  const st = proposalState(versions, Boolean(revision));
  const director = sheet.director;
  const running = data.stageState === "in_progress" && !sheet.closedAt;
  // In the app only for a director with an account (or whoever organises,
  // for him); a director of the Réseau deposits on his link.
  const canDeposit =
    running &&
    director?.kind === "person" &&
    (director.id === viewerId || data.canOrganize);
  const ext = Boolean(sheet.creativeExt);
  return (
    <section
      id="proposal"
      aria-label={t.link.title}
      className="flex flex-col gap-4"
    >
      {st.retained && (
        <ToneCallout tone="success">
          <span>
            <b className="font-semibold">{t.retained(st.retained.number)}</b>
            {st.rework ? t.retainedPending(st.retained.number, ext) : "."}
          </span>
        </ToneCallout>
      )}
      {revision && (
        <ToneCallout tone="warning">
          {revision.by
            ? t.requested(
                revision.by,
                formatShortInstant(revision.at),
                revision.reason,
              )
            : t.requestedBare(formatShortInstant(revision.at), revision.reason)}
        </ToneCallout>
      )}
      <ProposalVersions versions={versions} />
      {st.waitsInt && st.latest && canReview && running ? (
        <ProposalDecision
          side="int"
          versionId={st.latest.id}
          number={st.latest.number}
          projectId={projectId}
        />
      ) : st.depositOpen && canDeposit ? (
        <ProposalDepositForm
          place={{ kind: "app", projectId, sheetId: sheet.id }}
          number={(st.latest?.number ?? 0) + 1}
          asked={revision?.reason ?? null}
        />
      ) : null}
      {st.retained &&
        st.retained.id === st.latest?.id &&
        !revision &&
        canReview &&
        running &&
        director && (
          <ProposalRequestForm
            projectId={projectId}
            sheetId={sheet.id}
            retained={st.retained.number}
            director={director.name}
          />
        )}
    </section>
  );
}
