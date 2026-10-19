import { EngineerThread } from "@/components/master-workflow/engineer-thread";
import {
  PublicDeliveries,
  PublicPackageView,
} from "@/components/master-workflow/public-package";
import type { PortalCardItem } from "@/components/portal/portal-sections";
import { fr } from "@/lib/i18n/fr";
import type { EngineerMessage } from "@/lib/master-workflow/engineer-messages";
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
}: {
  linkKey: string;
  data: OpenPackage;
  thread: EngineerMessage[];
}): PortalCardItem[] {
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
