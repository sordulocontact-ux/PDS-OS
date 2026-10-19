import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { splitPortalCard } from "@/components/legal/splits/public-cards";
import { PortalShell } from "@/components/portal/portal-shell";
import {
  PortalSections,
  portalTitle,
} from "@/components/portal/portal-sections";
import { fr } from "@/lib/i18n/fr";
import { getPortalFrame } from "@/lib/portal/frame";
import { getPublicSplit } from "@/lib/legal/splits/public";

const t = fr.legalSplits.public;

// A split confirmation opened from its link, without an account (ticket
// Juridique 04). Never indexed, no referrer: the token is the key.
export const metadata: Metadata = {
  title: `${t.title} · ${fr.app.name}`,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function SplitConfirmationPage({
  params,
}: PageProps<"/s/[token]">) {
  const { token } = await params;
  const [split, frame] = await Promise.all([
    getPublicSplit(token),
    getPortalFrame("split", token),
  ]);
  if (!split) notFound();
  if (split.state === "expired" || split.state === "revoked")
    return (
      <PortalShell frame={frame} title={fr.portal.closed}>
        <p className="text-muted-foreground">{t.states[split.state]}</p>
      </PortalShell>
    );
  const cards = [
    splitPortalCard({ linkKey: token, split, project: frame?.project ?? "" }),
  ];
  return (
    <PortalShell
      frame={frame}
      role={fr.portal.roles.split}
      title={portalTitle(cards)}
    >
      <PortalSections cards={cards} />
    </PortalShell>
  );
}
