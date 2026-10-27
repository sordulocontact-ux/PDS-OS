import type { PortalCardItem } from "@/components/portal/portal-sections";
import { ProposalDecision } from "@/components/production/proposal/proposal-decision";
import { ProposalDepositForm } from "@/components/production/proposal/proposal-deposit-form";
import { ProposalVersions } from "@/components/production/proposal/proposal-versions";
import { productionProposal } from "@/lib/i18n/fr/production-proposal";
import {
  proposalState,
  type ProposalVersion,
} from "@/lib/production/proposal/model";
import type { LinkJourney } from "@/lib/production/provider/journey";

const fr = { productionProposal };

const t = fr.productionProposal;

/** The versions as the link reads them. */
export function linkProposalVersions(j: LinkJourney): ProposalVersion[] {
  return j.directionVersions.map((v) => ({
    id: v.id,
    number: v.number,
    treatmentUrl: v.treatmentUrl,
    moodboardUrl: v.moodboardUrl,
    cuttingUrl: v.cuttingUrl,
    note: v.note,
    depositedBy: v.depositedBy ?? "—",
    depositedAt: v.depositedAt,
    int: v.intStatus,
    intBy: null,
    intComment: v.intComment,
    ext: v.extStatus,
    extBy: null,
    extComment: v.extComment,
  }));
}

/**
 * « Proposition de réalisation » on a private link (proto portal, PR-11):
 * the director deposits V1, V2… and reads the decisions; the external
 * creative validation decides the latest version, in addition to the
 * internal one. Nothing else of the production.
 */
export function linkProposalCard(
  token: string,
  j: LinkJourney,
): PortalCardItem | null {
  const director = j.roles.includes("director");
  const validator = j.roles.includes("creativeExt");
  if ((!director && !validator) || j.organization !== "external") return null;
  const versions = linkProposalVersions(j);
  const st = proposalState(versions, j.directionRevision !== null);
  const next = (st.latest?.number ?? 0) + 1;
  const deposit = director && st.depositOpen;
  const decide = validator && st.waitsExt && st.latest;
  const todo = deposit || Boolean(decide);
  return {
    id: "ps-proposal",
    title: t.link.title,
    state: todo ? "todo" : st.retained && !st.rework ? "done" : "waiting",
    order: 20,
    action: deposit
      ? { label: st.latest ? t.todo.again : t.todo.deposit }
      : decide && st.latest
        ? { label: t.todo.validate(st.latest.number) }
        : null,
    body: (
      <>
        <p className="text-pretty text-muted-foreground">{t.link.hint}</p>
        {st.retained && (
          <p>
            <b className="font-semibold">{t.retained(st.retained.number)}</b>
            {st.rework ? t.retainedPending(st.retained.number, validator) : "."}
          </p>
        )}
        <ProposalVersions versions={versions} />
        {decide && st.latest && (
          <ProposalDecision
            side="ext"
            versionId={st.latest.id}
            number={st.latest.number}
            token={token}
          />
        )}
        {deposit && (
          <ProposalDepositForm
            place={{ kind: "link", token }}
            number={next}
            asked={j.directionRevision?.reason ?? null}
          />
        )}
      </>
    ),
  };
}
