import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PortalShell } from "@/components/portal/portal-shell";
import {
  PortalSections,
  portalTitle,
} from "@/components/portal/portal-sections";
import { creatorCard } from "@/components/activations/influence/creator-collaboration";
import { PublicAgreement } from "@/components/activations/influence/public-agreement";
import { getCreatorCollaboration } from "@/lib/activations/influence/creator-link";
import { getPublicAgreement } from "@/lib/activations/influence/public";
import { fr } from "@/lib/i18n/fr";
import { getPortalFrame } from "@/lib/portal/frame";

const t = fr.activationInfluence.public;

// The creator's express agreement, opened from its link without an account
// (ticket Influence § 8). Never indexed, no referrer : the token is the key.
export const metadata: Metadata = {
  title: `${t.title} · ${fr.app.name}`,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function InfluenceAgreementPage({
  params,
}: PageProps<"/i/[token]">) {
  const { token } = await params;
  const agreement = await getPublicAgreement(token);
  if (!agreement) notFound();
  const frame = await getPortalFrame("influence", token);
  if (agreement.state === "expired" || agreement.state === "revoked")
    return (
      <PortalShell frame={frame} title={fr.portal.closed}>
        <p className="text-muted-foreground">{t.states[agreement.state]}</p>
      </PortalShell>
    );
  // After « Bon pour accord », the same link serves the whole collaboration
  // (proto creatorPortal): content, publication, invoice.
  const collab =
    agreement.state === "accepted"
      ? await getCreatorCollaboration(token)
      : null;
  const step = collab ? creatorCard(token, collab) : null;
  const open = agreement.state === "open";
  const cards = [
    ...(step
      ? [
          {
            id: "ps-collaboration",
            title: step.title,
            state: step.state,
            action: { label: step.title },
            order: 2,
            body: step.body,
          },
        ]
      : []),
    {
      id: "ps-agreement",
      title: fr.portal.influence.title,
      state: open
        ? ("todo" as const)
        : agreement.state === "change_requested"
          ? ("waiting" as const)
          : ("done" as const),
      action: { label: fr.portal.influence.action },
      order: 1,
      body: open ? (
        <>
          <p className="text-muted-foreground">
            {t.intro(
              agreement.content.creator,
              agreement.content.campaign,
              agreement.content.project,
            )}
          </p>
          <PublicAgreement token={token} agreement={agreement} />
        </>
      ) : (
        <p className="font-medium">{t.states[agreement.state]}</p>
      ),
    },
  ];
  return (
    <PortalShell
      frame={frame}
      role={fr.portal.roles.influence}
      title={portalTitle(cards)}
    >
      <PortalSections cards={cards} />
    </PortalShell>
  );
}
