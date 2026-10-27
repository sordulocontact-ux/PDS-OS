import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { Fold } from "@/components/ui/fold";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
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
      <div className="flex flex-col gap-4 rounded-xl border p-4">
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
      <PageSection id="negotiation" title={t.negotiation.title}>
        <EmptyNote>{t.negotiation.restricted}</EmptyNote>
      </PageSection>
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
    <PageSection
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
          <ol className="flex flex-col gap-3">
            {proposals.map((p) => (
              <li
                key={p.id}
                className="flex flex-col gap-2 rounded-xl border bg-card p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {t.negotiation.parties[p.party as "pds" | "creator"]}
                    <span className="font-normal text-muted-foreground">
                      {" · "}
                      {t.negotiation.by(
                        nameOf(p.created_by),
                        formatDateTime(p.created_at),
                      )}
                    </span>
                  </span>
                  <span className="flex gap-2">
                    {p.id === latest?.id && (
                      <StatusBadge size="sm" tone="info">
                        {t.negotiation.latest}
                      </StatusBadge>
                    )}
                    {p.accepted_at && (
                      <StatusBadge size="sm" tone="success">
                        {t.negotiation.acceptedBy(
                          nameOf(p.accepted_by),
                          formatDate(p.accepted_at),
                        )}
                      </StatusBadge>
                    )}
                  </span>
                </div>
                {terms(p).length > 0 && (
                  <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                    {terms(p).map(([label, value]) => (
                      <div key={label} className="flex flex-col">
                        <dt className="text-xs text-muted-foreground">
                          {label}
                        </dt>
                        <dd className="break-words">{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {p.note && <p className="text-sm break-words">{p.note}</p>}
                {canWrite && p.id === latest?.id && !p.accepted_at && (
                  <div>
                    <AcceptTermsButton
                      projectId={projectId}
                      proposalId={p.id}
                    />
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
        <div className="flex flex-col gap-2 rounded-xl border border-dashed p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-medium">{t.agreement.title}</h3>
            {agreement && (
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
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {t.agreement.description}
          </p>
          {agreement ? (
            <p className="text-sm">
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
            <p className="text-sm text-muted-foreground">
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
                  <p className="text-sm text-muted-foreground">
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
        </div>
      </div>
    </PageSection>
  );
}
