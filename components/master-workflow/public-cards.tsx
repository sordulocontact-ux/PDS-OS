import { deliverablesPortalCard } from "@/components/master-workflow/deliverables-link-card";
import { EngineerThread } from "@/components/master-workflow/engineer-thread";
import { invoicePortalCards } from "@/components/invoices/invoice-portal-cards";
import {
  PublicDeliveries,
  PublicPackageView,
} from "@/components/master-workflow/public-package";
import type { PortalCardItem } from "@/components/portal/portal-sections";
import { fr } from "@/lib/i18n/fr";
import type { EngineerMessage } from "@/lib/master-workflow/engineer-messages";
import type { LinkDeliverable } from "@/lib/master-workflow/deliverables-public";
import type { PersonInvoices } from "@/lib/invoices/public";
import type { PublicPackage } from "@/lib/master-workflow/transmission-public";

const t = fr.masterWorkflow.publicPackage;
const r = fr.masterRound;

type OpenPackage = Extract<PublicPackage, { state: "open" | "received" }>;

/**
 * The engineer's cards (Master, proto `master-v2.html`): the package to
 * take charge of, the exchanges with the label, the versions to deposit.
 * Shown on the sending's own link (/m) and on the person's page (/c):
 * `linkKey` says which (lib/portal/link-key.ts).
 */
export function masterPortalCards({
  linkKey,
  data,
  thread,
  invoices = null,
  deliverables = [],
}: {
  linkKey: string;
  data: OpenPackage;
  thread: EngineerMessage[];
  // « Votre facture », once PDS asked for one (the Master final validated,
  // a paid contract signed): on the link /m only; the person's page /c
  // reads them by its own token, once for the whole page.
  invoices?: PersonInvoices | null;
  // « Autres livrables », once a title has its Master final.
  deliverables?: LinkDeliverable[];
}): PortalCardItem[] {
  const deliverablesCard = deliverablesPortalCard({
    linkKey,
    items: deliverables,
  });
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
  return [
    ...(invoices
      ? invoicePortalCards({
          token: linkKey,
          data: invoices,
          project: data.package.project,
          person: data.package.engineer,
        })
      : []),
    ...(deliverablesCard ? [deliverablesCard] : []),
    {
      id: "ps-package",
      title: r.portal.package,
      state: taken ? "done" : "todo",
      action: taken ? null : { label: r.take.title, due: null },
      order: 1,
      workflow: "master",
      body: (
        <>
          <p className="text-muted-foreground">
            {t.intro[role](data.package.project, data.package.engineer)}
          </p>
          <PublicPackageView token={linkKey} data={data} />
        </>
      ),
    },
    {
      id: "ps-thread",
      title: r.portal.thread,
      state: "waiting",
      order: 2,
      workflow: "master",
      body: <EngineerThread token={linkKey} messages={thread} />,
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
      workflow: "master",
      body: <PublicDeliveries token={linkKey} data={data} />,
    },
  ];
}
