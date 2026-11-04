import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { masterPortalCards } from "@/components/master-workflow/public-cards";
import { PortalShell } from "@/components/portal/portal-shell";
import {
  PortalSections,
  portalTitle,
} from "@/components/portal/portal-sections";
import { fr } from "@/lib/i18n/fr";
import { getLinkDeliverables } from "@/lib/master-workflow/deliverables-public";
import { getPersonInvoices } from "@/lib/invoices/public";
import { getPortalFrame } from "@/lib/portal/frame";
import {
  getEngineerThread,
  getPublicPackage,
  getRateRefusals,
  noteOpened,
} from "@/lib/master-workflow/transmission-public";

const t = fr.masterWorkflow.publicPackage;

// The package sent to the engineer, opened from its link without an
// account (Master, lot 4; proto `master-v2.html`): « Ce que PDS attend de
// vous », the cards sorted « À vous », « En attente de PDS », « Fait ».
// Never indexed, no referrer: the token is the key.
export const metadata: Metadata = {
  title: `${t.pageTitle} · ${fr.app.name}`,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function MasterPackagePage({
  params,
}: PageProps<"/m/[token]">) {
  const { token } = await params;
  const data = await getPublicPackage(token);
  if (!data) notFound();
  const frame = await getPortalFrame("master", token);
  if (data.state !== "open" && data.state !== "received")
    return (
      <PortalShell frame={frame} title={fr.portal.closed}>
        <p className="text-muted-foreground">{t[data.state]}</p>
      </PortalShell>
    );
  await noteOpened(token);
  const cards = masterPortalCards({
    linkKey: token,
    data,
    thread: await getEngineerThread(token),
    invoices: await getPersonInvoices(token),
    deliverables: await getLinkDeliverables(token),
    refusals: await getRateRefusals(token),
  });
  return (
    <PortalShell
      frame={frame}
      role={fr.portal.roles[data.package.role]}
      title={portalTitle(cards)}
    >
      <PortalSections cards={cards} />
    </PortalShell>
  );
}
