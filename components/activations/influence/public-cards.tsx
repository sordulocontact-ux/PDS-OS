import type { PortalCardItem } from "@/components/portal/portal-sections";
import { creatorCard } from "@/components/activations/influence/creator-collaboration";
import { PublicAgreement } from "@/components/activations/influence/public-agreement";
import type { CreatorCollaboration } from "@/lib/activations/influence/creator-link";
import type { PublicAgreement as PublicAgreementData } from "@/lib/activations/influence/public";
import { activationInfluence } from "@/lib/i18n/fr/activation-influence";
import { portal } from "@/lib/i18n/fr/portal";

const fr = { activationInfluence, portal };

const t = fr.activationInfluence.public;

/**
 * The creator's cards (ticket Influence § 8, proto creatorPortal): the
 * express agreement, then, once accepted, the collaboration's step
 * (content, publication, invoice). On the agreement's own link (/i) and on
 * the person's page (/c): `linkKey` says which.
 */
export function influencePortalCards({
  linkKey,
  agreement,
  collab,
}: {
  linkKey: string;
  agreement: Exclude<PublicAgreementData, { state: "expired" | "revoked" }>;
  collab: CreatorCollaboration | null;
}): PortalCardItem[] {
  const step = collab ? creatorCard(linkKey, collab) : null;
  const open = agreement.state === "open";
  return [
    ...(step
      ? [
          {
            id: "ps-collaboration",
            title: step.title,
            state: step.state,
            action: { label: step.title },
            order: 2,
            workflow: "marketing" as const,
            body: step.body,
          },
        ]
      : []),
    {
      id: "ps-agreement",
      title: fr.portal.influence.title,
      state: open
        ? "todo"
        : agreement.state === "change_requested"
          ? "waiting"
          : "done",
      action: { label: fr.portal.influence.action },
      order: 1,
      workflow: "marketing",
      body:
        agreement.state === "open" ? (
          <>
            <p className="text-muted-foreground">
              {t.intro(
                agreement.content.creator,
                agreement.content.campaign,
                agreement.content.project,
              )}
            </p>
            <PublicAgreement token={linkKey} agreement={agreement} />
          </>
        ) : (
          <p className="font-medium">{t.states[agreement.state]}</p>
        ),
    },
  ];
}
