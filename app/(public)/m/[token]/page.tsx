import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PortalShell } from "@/components/portal/portal-shell";
import {
  PortalSections,
  portalTitle,
} from "@/components/portal/portal-sections";
import { PublicPackageView } from "@/components/master-workflow/public-package";
import { fr } from "@/lib/i18n/fr";
import { getPortalFrame } from "@/lib/portal/frame";
import {
  getEngineerThread,
  getPublicPackage,
  noteOpened,
} from "@/lib/master-workflow/transmission-public";

const t = fr.masterWorkflow.publicPackage;

// The package sent to the mix engineer, opened from its link without an
// account (Master, lot 4). Never indexed, no referrer: the token is the key.
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
  const role = data.package.role;
  const p = fr.portal.master;
  // Acknowledge first; then deposit a version, until one is delivered.
  const cards = [
    {
      id: "ps-package",
      title: p.title[role],
      state:
        data.state === "open" || data.deliveries.length === 0
          ? ("todo" as const)
          : ("waiting" as const),
      action: {
        label: data.state === "open" ? p.acknowledge : p.deliver,
        due: null,
      },
      order: 1,
      body: (
        <>
          <p className="text-muted-foreground">
            {t.intro[role](data.package.project, data.package.engineer)}
          </p>
          <PublicPackageView
            token={token}
            data={data}
            messages={await getEngineerThread(token)}
          />
        </>
      ),
    },
  ];
  return (
    <PortalShell
      frame={frame}
      role={fr.portal.roles[role]}
      title={portalTitle(cards)}
    >
      <PortalSections cards={cards} />
    </PortalShell>
  );
}
