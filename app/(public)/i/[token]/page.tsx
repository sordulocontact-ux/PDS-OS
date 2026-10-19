import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { influencePortalCards } from "@/components/activations/influence/public-cards";
import { PortalShell } from "@/components/portal/portal-shell";
import {
  PortalSections,
  portalTitle,
} from "@/components/portal/portal-sections";
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
  const cards = influencePortalCards({ linkKey: token, agreement, collab });
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
