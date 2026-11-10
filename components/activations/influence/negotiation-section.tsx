import { EmptyNote } from "@/components/shell/empty-state";
import { ActivationSection } from "@/components/activations/activation-section";
import { StepSection } from "@/components/shell/journey/step-section";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { Fold } from "@/components/ui/fold";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { VersionCard } from "@/components/ui/version-card";
import { agreementContentSchema } from "@/lib/activations/influence/agreement-content";
import type { InfluenceData } from "@/lib/activations/influence/queries";
import type { Member } from "@/lib/framing/related";
import { activationInfluence } from "@/lib/i18n/fr/activation-influence";
import { formatDate, formatDateTime } from "@/lib/release/format";

import { AgreementSendForm } from "./agreement-send-form";
import { AgreementTerms } from "./agreement-terms";
import {
  AcceptTermsButton,
  AddProposalButton,
  PrepareAgreementButton,
  RevokeAgreementButton,
} from "./negotiation-buttons";

const fr = { activationInfluence };

const t = fr.activationInfluence;
const agreementTone = {
  pending: "warning",
  accepted: "success",
  change_requested: "action",
  revoked: "neutral",
} as const;

/** « Aperçu de la page du créateur » : the exact version the link shows. */
function agreementPreview(content: unknown) {
  const parsed = agreementContentSchema.safeParse(content);
  if (!parsed.success) return null;
  return (
    <Fold summary={t.agreement.preview}>
      <div className="flex flex-col gap-4 rounded-xl border border-[color:var(--border-hairline)] p-4">
        <AgreementTerms content={parsed.data} />
      </div>
    </Fold>
  );
}

const money = (amount: number | null, currency: string) =>
  amount === null
    ? null
    : new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(
        amount,
      );

/**
 * The negotiation's timeline (every position, immutable, in order), the
 * decision that validates the latest one, then the express agreement link
 * and its trace. Amounts and agreement : budget readers only.
 */
export function NegotiationSection({
  projectId,
  activationId,
  targetId,
  campaign,
  creator,
  email,
  proposals,
  agreements,
  members,
  canWrite,
  canSeeBudget,
}: {
  projectId: string;
  activationId: string;
  targetId: string;
  campaign: string;
  // The creator's name, for « À : … » (MKT-INF-002).
  creator: string;
  email: string | null;
  proposals: InfluenceData["proposals"];
  agreements: InfluenceData["agreements"];
  members: Member[];
  canWrite: boolean;
  canSeeBudget: boolean;
}) {
  if (!canSeeBudget)
    return (
      <ActivationSection id="negotiation" title={t.negotiation.title}>
        <EmptyNote>{t.negotiation.restricted}</EmptyNote>
      </ActivationSection>
    );
  const nameOf = (id: string | null) =>
    members.find((m) => m.personId === id)?.name ?? t.negotiation.creatorLink;
  const latest = proposals.at(-1);
  const agreement = agreements[0];
  const terms = (p: (typeof proposals)[number]) =>
    [
      [
        t.negotiation.fee,
        money(p.fee_amount === null ? null : Number(p.fee_amount), p.currency),
      ],
      [t.negotiation.deliverables, p.deliverables],
      [t.negotiation.schedule, p.schedule],
      [t.negotiation.organicUsage, p.organic_usage],
      [t.negotiation.adsUsage, p.ads_usage],
      [t.negotiation.exclusivity, p.exclusivity],
      [t.negotiation.expenses, p.expenses],
      [t.negotiation.conditions, p.conditions],
    ].filter((pair): pair is [string, string] => Boolean(pair[1]));

  return (
    <ActivationSection
      id="negotiation"
      title={t.negotiation.title}
      description={t.negotiation.description}
      action={
        canWrite && (
          <AddProposalButton
            projectId={projectId}
            activationId={activationId}
            targetId={targetId}
          />
        )
      }
    >
      <div className="flex flex-col gap-4">
        {proposals.length === 0 ? (
          <EmptyNote>{t.negotiation.none}</EmptyNote>
        ) : (
          <div className="flex flex-col gap-3">
            {proposals.map((p) => {
              const isLatest = p.id === latest?.id;
              const facts = terms(p);
              return (
                <VersionCard
                  key={p.id}
                  title={t.negotiation.parties[p.party as "pds" | "creator"]}
                  status={
                    p.accepted_at
                      ? {
                          tone: "success",
                          label: t.negotiation.acceptedBy(
                            nameOf(p.accepted_by),
                            formatDate(p.accepted_at),
                          ),
                        }
                      : isLatest
                        ? { tone: "info", label: t.negotiation.latest }
                        : null
                  }
                  meta={t.negotiation.by(
                    nameOf(p.created_by),
                    formatDateTime(p.created_at),
                  )}
                  defaultOpen={isLatest}
                >
                  {facts.length > 0 && (
                    <FactRows>
                      {facts.map(([label, value]) => (
                        <FactRow key={label} label={label} value={value} />
                      ))}
                    </FactRows>
                  )}
                  {p.note && (
                    <p className="text-body-sm break-words">{p.note}</p>
                  )}
                  {canWrite && isLatest && !p.accepted_at && (
                    <div>
                      <AcceptTermsButton
                        projectId={projectId}
                        proposalId={p.id}
                      />
                    </div>
                  )}
                </VersionCard>
              );
            })}
          </div>
        )}
        <StepSection
          title={t.agreement.title}
          description={t.agreement.description}
          aside={
            agreement && (
              <StatusBadge
                size="sm"
                tone={
                  agreementTone[agreement.status as keyof typeof agreementTone]
                }
              >
                {
                  t.agreement.states[
                    agreement.status as keyof typeof t.agreement.states
                  ]
                }
              </StatusBadge>
            )
          }
        >
          {agreement ? (
            <p className="text-body-sm">
              {[
                t.agreement.created(formatDateTime(agreement.created_at)),
                agreement.sent_at
                  ? t.agreement.sentBy(
                      nameOf(agreement.sent_by),
                      formatDateTime(agreement.sent_at),
                      t.agreement.channels[
                        agreement.sent_channel as keyof typeof t.agreement.channels
                      ] ??
                        agreement.sent_channel ??
                        "",
                    )
                  : agreement.status === "pending"
                    ? t.agreement.notSent
                    : null,
                agreement.displayed_at
                  ? t.agreement.viewed(formatDateTime(agreement.displayed_at))
                  : null,
                agreement.status === "accepted" && agreement.decided_at
                  ? t.agreement.acceptedBy(
                      agreement.identity_name ?? "—",
                      formatDateTime(agreement.decided_at),
                    )
                  : null,
                agreement.comment,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : (
            <p className="text-body-sm text-[color:var(--text-secondary)]">
              {t.agreement.noneYet}
            </p>
          )}
          {agreement?.status === "pending" &&
            agreementPreview(agreement.content)}
          {canWrite &&
            agreement?.status === "pending" &&
            !agreement.sent_at && (
              <AgreementSendForm
                projectId={projectId}
                agreementId={agreement.id}
                to={t.agreement.to(creator, email)}
              />
            )}
          {canWrite && (
            <div className="flex flex-wrap gap-2">
              {latest?.accepted_at && agreement?.status !== "accepted" ? (
                <PrepareAgreementButton
                  projectId={projectId}
                  proposalId={latest.id}
                  campaign={campaign}
                  email={email}
                />
              ) : (
                !latest?.accepted_at && (
                  <p className="text-body-sm text-[color:var(--text-secondary)]">
                    {t.agreement.needsTerms}
                  </p>
                )
              )}
              {agreement?.status === "pending" && (
                <RevokeAgreementButton
                  projectId={projectId}
                  agreementId={agreement.id}
                />
              )}
            </div>
          )}
          <ToneCallout tone="neutral">{t.agreement.legalNote}</ToneCallout>
        </StepSection>
      </div>
    </ActivationSection>
  );
}
