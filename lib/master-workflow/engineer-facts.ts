// Mix et mastering of the État du master, per title: who mixes, who masters,
// read from the title's credits, then from its sessions, and whether each
// person is in the Réseau. Pure, built by code from rows already read.

import { routes } from "@/lib/auth/redirects";
import type { SessionKind } from "@/lib/catalog/master/rules";
import { sessionLabel } from "@/lib/catalog/master/session-label";
import {
  creditContactState,
  type CreditLink,
  type CreditRights,
  type NetworkIndex,
} from "@/lib/facts/credit-contact";
import { groupOf } from "@/lib/facts/types";
import { fr } from "@/lib/i18n/fr";
import type {
  FlowSession,
  FlowTitle,
} from "@/lib/master-workflow/source-facts";
import {
  ENGINEER_ROLES,
  type EngineerRole,
  type MasterFact,
} from "@/lib/master-workflow/types";

/** A mix or mastering credit of a title (master_contributors). */
export type FlowCredit = {
  id: string;
  name: string;
  role: EngineerRole;
  detail: string | null;
  // Its contact in the Réseau, once linked.
  contactId: string | null;
};

// The session that names the engineer of a role.
const SESSION_OF: Record<EngineerRole, SessionKind> = {
  mix_engineer: "mixing",
  mastering_engineer: "mastering",
};

const t = fr.masterWorkflow.inventory;

export type EngineerContext = {
  network: NetworkIndex;
  // Engineers of the Réseau: named when a role has nobody, so nobody asks
  // whether the Réseau has one.
  engineersInNetwork: number;
  // add_to_network: manage_network; link and credit: manage_catalog.
  rights: CreditRights;
  // The project's unlinked mix and mastering credits by name: the same
  // engineer on several titles is linked in one decision.
  sameName: Map<string, CreditLink[]>;
};

function roleFacts(
  title: FlowTitle,
  role: EngineerRole,
  credits: FlowCredit[],
  sessions: FlowSession[],
  context: EngineerContext,
): MasterFact[] {
  const roleLabel = fr.masterPage.credits.roles[role];
  const base = { group: groupOf(title) };
  const credited = credits.filter((credit) => credit.role === role);
  // Credited: the credit is the source; the Réseau tells the rest.
  if (credited.length > 0)
    return credited.map((credit) => ({
      ...base,
      key: `${role}-${credit.id}`,
      label: credit.name,
      detail: [roleLabel, credit.detail].filter(Boolean).join(" · "),
      source: t.sources.credits,
      ...creditContactState(
        { ...credit, masterId: title.id },
        context.network,
        context.rights,
        "engineer",
        context.sameName,
      ),
    }));

  // Named in a session but not credited: a person confirms by crediting.
  const session = sessions.find(
    (row) => row.kind === SESSION_OF[role] && row.engineer,
  );
  if (session?.engineer)
    return [
      {
        ...base,
        key: `${role}-session-${title.id}`,
        label: session.engineer,
        // "Mixage · Studio Ferber · 12 sept.": the kind names the role.
        detail: sessionLabel(session),
        source: t.sources.sessions,
        status: "to_confirm",
        statusLabel: t.states.namedInSession,
        href: routes.masterSessions(title.id),
        action: context.rights.link
          ? {
              kind: "credit_engineer",
              masterId: title.id,
              role,
              name: session.engineer,
            }
          : undefined,
      },
    ];

  return [
    {
      ...base,
      key: `${role}-${title.id}`,
      label: roleLabel,
      detail:
        context.engineersInNetwork > 0
          ? t.engineersInNetwork(context.engineersInNetwork)
          : null,
      source: t.sources.credits,
      status: "missing",
      statusLabel: t.states.nobody,
      href: routes.masterCredits(title.id),
      action: context.rights.link
        ? { kind: "credit_engineer", masterId: title.id, role, name: null }
        : undefined,
    },
  ];
}

/** Who mixes, then who masters the title. */
export function engineerFacts(
  title: FlowTitle,
  credits: FlowCredit[],
  sessions: FlowSession[],
  context: EngineerContext,
): MasterFact[] {
  return ENGINEER_ROLES.flatMap((role) =>
    roleFacts(title, role, credits, sessions, context),
  );
}
