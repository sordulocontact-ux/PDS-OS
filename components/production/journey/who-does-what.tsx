import { ProviderLinkButton } from "@/components/production/post/provider-link-button";
import {
  RolesPanel,
  type RoleHistoryLine,
  type RoleRow,
} from "@/components/shell/module/roles-panel";
import type { PrivateLinkRow } from "@/components/shell/module/private-links";
import { WhoDoesWhatButton } from "@/components/shell/module/who-does-what-button";
import { fr } from "@/lib/i18n/fr";
import type { ProviderLinkState } from "@/lib/production/post/types";
import type { ProductionSheetData } from "@/lib/production/sheet";

const t = fr.productionOrganization;
const r = fr.roles.production;

type Props = {
  projectId: string;
  data: ProductionSheetData;
  links: Record<string, ProviderLinkState>;
  canOrganize: boolean;
  history?: RoleHistoryLine[];
};

/**
 * « Qui fait quoi » of a deliverable's production (Ibé 14/10, sub-lot C7),
 * on the common `RolesPanel`: each role with its kind and holder, the
 * private links of the Réseau contacts (no account for providers), the
 * changes of organisation. `ProductionWhoDoesWhatButton`: the same in the
 * header's modal.
 */
export function WhoDoesWhat(props: Props) {
  const panel = productionRoles(props);
  return panel ? (
    <section aria-labelledby="who-does-what" className="flex flex-col gap-3">
      <h3 id="who-does-what" className="text-body-md font-semibold">
        {t.whoDoesWhat}
      </h3>
      <RolesPanel {...panel} />
      <p className="text-sm text-muted-foreground">{t.explain}</p>
    </section>
  ) : null;
}

export function ProductionWhoDoesWhatButton(props: Props) {
  const panel = productionRoles(props);
  return panel ? <WhoDoesWhatButton {...panel} /> : null;
}

function productionRoles({
  projectId,
  data,
  links,
  canOrganize,
  history,
}: Props) {
  const sheet = data.sheet;
  if (!sheet) return null;
  const org = sheet.organization;
  const member = (p: { name: string } | null) =>
    p ? { name: p.name, detail: r.member } : null;
  const contact = (c: { name: string } | null) =>
    c ? { name: c.name, viaLink: true } : null;
  const rows: (RoleRow | null)[] = [
    {
      key: "owner",
      label: r.owner,
      kind: "coord",
      holder: data.ownerName ? { name: data.ownerName } : null,
      what: t.tasks.owner,
    },
    org.lineProducer && {
      key: "producer",
      label: r.producer,
      kind: "coord",
      holder: member(org.lineProducer),
      what: t.tasks.lineProducer,
    },
    org.company && {
      key: "company",
      label: r.company,
      kind: "exec",
      holder: contact(org.company),
      what: t.tasks.company,
    },
    sheet.director && {
      key: "director",
      label: r.director,
      kind: "exec",
      holder:
        sheet.director.kind === "contact"
          ? contact(sheet.director)
          : member(sheet.director),
      what: t.tasks.director,
    },
    org.dop && {
      key: "dop",
      label: r.dop,
      kind: "exec",
      holder: org.dop.kind === "contact" ? contact(org.dop) : member(org.dop),
      what: t.tasks.dop,
    },
    org.quoteValidator && {
      key: "validator",
      label: r.validator,
      kind: "valid",
      holder: member(org.quoteValidator),
      what: t.tasks.validator,
    },
  ];
  const roles = rows.filter((x): x is RoleRow => Boolean(x));
  const holders = [
    org.company && { holder: org.company, role: r.company },
    sheet.director?.kind === "contact" && {
      holder: sheet.director,
      role: r.director,
    },
    org.dop?.kind === "contact" && { holder: org.dop, role: r.dop },
  ].filter((x) => Boolean(x)) as {
    holder: { kind: "contact"; id: string; name: string };
    role: string;
  }[];
  const privateLinks: PrivateLinkRow[] = holders.map(({ holder, role }) => {
    const l = links[holder.id] ?? null;
    return {
      key: `${holder.id}-${role}`,
      name: holder.name,
      role,
      link: l && {
        number: l.number,
        createdAt: l.createdAt,
        createdBy: l.createdBy,
        openedAt: l.lastOpenedAt,
        expiresAt: l.expiresAt,
      },
      renew: canOrganize ? (
        <ProviderLinkButton
          projectId={projectId}
          sheetId={sheet.id}
          holder={holder}
          link={l}
          renew
        />
      ) : null,
    };
  });
  return { roles, links: privateLinks, history };
}
