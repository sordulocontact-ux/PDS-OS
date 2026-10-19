import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EngineerThread } from "@/components/master-workflow/engineer-thread";
import {
  PublicDeliveries,
  PublicPackageView,
} from "@/components/master-workflow/public-package";
import { PortalShell } from "@/components/portal/portal-shell";
import {
  PortalSections,
  portalTitle,
  type PortalCardItem,
} from "@/components/portal/portal-sections";
import { fr } from "@/lib/i18n/fr";
import { getPortalFrame } from "@/lib/portal/frame";
import {
  getEngineerThread,
  getPublicPackage,
  noteOpened,
} from "@/lib/master-workflow/transmission-public";

const t = fr.masterWorkflow.publicPackage;
const r = fr.masterRound;

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
  const role = data.package.role;
  const taken = data.state === "received";
  // Per title, the latest version and whether a new one is expected.
  const latestOf = (masterId: string | null) =>
    data.versions.find(
      (v) => v.masterId === masterId && (v.stage ?? role) === role,
    );
  const titles = data.package.titles.filter((x) => x.masterId);
  const toDeposit = titles.some((x) => {
    const v = latestOf(x.masterId);
    return (
      !v || v.decision === "changes_requested" || v.decision === "reopened"
    );
  });
  const allApproved =
    titles.length > 0 &&
    titles.every((x) => latestOf(x.masterId)?.decision === "approved");
  const cards: PortalCardItem[] = [
    {
      id: "ps-package",
      title: r.portal.package,
      state: taken ? "done" : "todo",
      action: taken ? null : { label: r.take.title, due: null },
      order: 1,
      body: (
        <>
          <p className="text-muted-foreground">
            {t.intro[role](data.package.project, data.package.engineer)}
          </p>
          <PublicPackageView token={token} data={data} />
        </>
      ),
    },
    {
      id: "ps-thread",
      title: r.portal.thread,
      state: "waiting",
      order: 2,
      body: (
        <EngineerThread
          token={token}
          messages={await getEngineerThread(token)}
        />
      ),
    },
    {
      id: "ps-versions",
      title: r.portal.versions[role],
      state: !taken
        ? "waiting"
        : allApproved
          ? "done"
          : toDeposit
            ? "todo"
            : "waiting",
      action:
        taken && toDeposit ? { label: r.portal.deposit, due: null } : null,
      order: 3,
      body: <PublicDeliveries token={token} data={data} />,
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
