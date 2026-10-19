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
import type { Holder, ProductionSheetData } from "@/lib/production/sheet";

import { RevokeLinkButton } from "./revoke-link-button";
import { RoleChangeButton } from "./role-change-button";

const t = fr.productionOrganization;
const r = fr.roles.production;

type Props = {
  projectId: string;
  data: ProductionSheetData;
  links: Record<string, ProviderLinkState>;
  // Contacts whose last link was revoked, and when.
  revoked?: Record<string, string>;
  canOrganize: boolean;
  // The creative side (responsable créatif, validation créative interne).
  creativeName?: string | null;
  history?: RoleHistoryLine[];
  // Each person's page by project (lot 11), given by the server page.
  personLinks?: React.ReactNode;
};

/**
 * « Qui fait quoi » of a deliverable's production (proto rolesModal), on
 * the common `RolesPanel`: each role with its kind (Coordonne / Exécute /
 * Valide) and holder, « Changer » for the owner, the private links of the
 * Réseau contacts (« Nouveau lien », « Révoquer »), the changes of role.
 * `ProductionWhoDoesWhatButton`: the same in the header's modal.
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
  return panel ? (
    <WhoDoesWhatButton {...panel} personLinks={props.personLinks} />
  ) : null;
}

function productionRoles({
  projectId,
  data,
  links,
  revoked = {},
  canOrganize,
  creativeName,
  history,
}: Props) {
  const sheet = data.sheet;
  if (!sheet?.organization.kind) return null;
  const org = sheet.organization;
  const ext = org.kind === "external";
  // « Changer »: the project's owner, while the production runs.
  const canChange = data.canOpen && !sheet.closedAt;
  const member = (p: { name: string } | null) =>
    p ? { name: p.name, detail: r.member } : null;
  const held = (h: Holder | null) =>
    h
      ? h.kind === "contact"
        ? { name: h.name, viaLink: true }
        : member(h)
      : null;
  const change = (
    role: "producer" | "validator" | "director" | "dop",
    label: string,
    current: Holder | null,
    contacts = false,
  ) =>
    canChange ? (
      <RoleChangeButton
        projectId={projectId}
        sheetId={sheet.id}
        role={role}
        label={label}
        current={current}
        members={data.members}
        contacts={contacts ? data.contacts : []}
      />
    ) : undefined;
  const asHolder = (
    m: { personId: string; name: string } | null,
  ): Holder | null =>
    m ? { kind: "person", id: m.personId, name: m.name } : null;
  const creative = creativeName ?? data.ownerName;
  const rows: (RoleRow | null | false)[] = [
    {
      key: "owner",
      label: r.owner,
      kind: "coord",
      holder: data.ownerName ? { name: data.ownerName } : null,
      what: t.tasks.owner,
    },
    {
      key: "producer",
      label: r.producer,
      kind: "coord",
      holder:
        member(org.lineProducer) ??
        (data.ownerName ? { name: data.ownerName } : null),
      what: t.tasks.lineProducer,
      action: change("producer", r.producer, asHolder(org.lineProducer)),
    },
    ext && {
      key: "company",
      label: r.company,
      kind: "exec",
      holder: held(org.company),
      what: t.tasks.company,
    },
    {
      key: "director",
      label: r.director,
      kind: "exec",
      holder: held(sheet.director),
      what: t.tasks.director,
      action: change("director", r.director, sheet.director, true),
    },
    ext && {
      key: "post",
      label: r.post,
      kind: "exec",
      holder: held(org.company),
      what: t.tasks.post,
    },
    !ext && {
      key: "dop",
      label: r.dop,
      kind: "exec",
      holder: held(org.dop),
      what: t.tasks.dop,
      action: change("dop", r.dop, org.dop, true),
    },
    {
      key: "creative",
      label: r.creative,
      kind: "coord",
      holder: creative ? { name: creative } : null,
      what: t.tasks.creative,
    },
    {
      key: "validator",
      label: r.validator,
      kind: "valid",
      holder: member(org.quoteValidator),
      what: t.tasks.validator,
      action: change("validator", r.validator, asHolder(org.quoteValidator)),
    },
    {
      key: "creativeInt",
      label: r.creativeInt,
      kind: "valid",
      holder: creative ? { name: creative } : null,
      what: t.tasks.creativeInt,
    },
  ];
  const roles = rows.filter((x): x is RoleRow => Boolean(x));
  const holders = [
    ext && org.company && { holder: org.company, role: r.company },
    sheet.director?.kind === "contact" && {
      holder: sheet.director,
      role: r.director,
    },
    !ext && org.dop?.kind === "contact" && { holder: org.dop, role: r.dop },
  ].filter((x) => Boolean(x)) as {
    holder: { kind: "contact"; id: string; name: string };
    role: string;
  }[];
  const privateLinks: PrivateLinkRow[] = holders.map(({ holder, role }) => {
    const l = links[holder.id] ?? null;
    const revokedAt = l ? null : (revoked[holder.id] ?? null);
    return {
      key: `${holder.id}-${role}`,
      name: holder.name,
      role,
      link: l
        ? {
            number: l.number,
            createdAt: l.createdAt,
            createdBy: l.createdBy,
            openedAt: l.lastOpenedAt,
            expiresAt: l.expiresAt,
          }
        : revokedAt
          ? {
              number: 0,
              createdAt: revokedAt,
              createdBy: null,
              openedAt: null,
              revokedAt,
            }
          : null,
      renew: canOrganize ? (
        <span className="flex flex-wrap items-center gap-1.5">
          <ProviderLinkButton
            projectId={projectId}
            sheetId={sheet.id}
            holder={holder}
            link={l}
            renew
          />
          {l && (
            <RevokeLinkButton
              projectId={projectId}
              sheetId={sheet.id}
              contactId={holder.id}
              name={holder.name}
            />
          )}
        </span>
      ) : null,
    };
  });
  return { roles, links: privateLinks, history };
}
