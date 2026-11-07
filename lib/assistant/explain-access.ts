import "server-only";

import { pageRecord } from "@/lib/assistant/page-context";
import {
  loadPermissionHolders,
  positionLabel,
  type PermissionHolders,
} from "@/lib/assistant/permission-holders";
import type { Source } from "@/lib/assistant/sources";
import { stepsOfPage } from "@/lib/assistant/step-status";
import { can, type Access } from "@/lib/auth/access";
import { routes, type Permission } from "@/lib/auth/redirects";
import { getContract } from "@/lib/contracts/queries";
import { assistantAccess } from "@/lib/i18n/fr/assistant-access";
import { contracts } from "@/lib/i18n/fr/contracts";
import { transmission } from "@/lib/i18n/fr/transmission";
import { placeOf } from "@/lib/journey/types";
import { loadShellJourneys } from "@/lib/overview/journeys";
import {
  canEditProject,
  canSeeProjectBudget,
} from "@/lib/projects/edit-access";
import { getProject } from "@/lib/projects/queries";

const fr = { assistantAccess, contracts, transmission };

type Result = { facts: string[]; sources: Source[] };

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const CONTRACT = new RegExp(`^/app/contracts/(${UUID})(?:/|$)`);

/** « Votre poste vous permet de… » or « … Le peuvent : Nora (DG) ». */
function needs(
  access: Access,
  holders: PermissionHolders,
  permission: Permission,
  what: string,
): string {
  const t = fr.assistantAccess;
  if (can(access, permission)) return t.youCan(what);
  const names = holders
    .members(permission)
    .map((m) => t.holder(m.name, m.position));
  return t.youCannot(what, names.length ? names.join(", ") : t.nobodyHolds);
}

/** Who writes in the project, and why the viewer may or may not. */
async function projectFacts(
  access: Access,
  holders: PermissionHolders,
  path: string,
  id: string,
  section: string | undefined,
): Promise<Result> {
  const t = fr.assistantAccess.project;
  const project = await getProject(id);
  if (!project) return { facts: [t.hidden], sources: [] };
  const facts: string[] = [];
  const sources = [{ label: project.title, href: routes.project(id) }];

  if (project.status !== "launched") {
    facts.push(
      t.notLaunched(project.title, fr.transmission.statuses[project.status]),
    );
    facts.push(needs(access, holders, "create_projects", t.editBeforeLaunch));
    const latest = project.assignments[0];
    if (project.status === "pending" && latest)
      facts.push(
        latest.assigneePersonId === access.personId
          ? t.toAnswer
          : t.waitingOn(latest.assigneeName),
      );
    return { facts, sources };
  }

  if (canEditProject(access, project)) facts.push(t.owner(project.title));
  else {
    facts.push(t.launchedOther(project.title, project.ownerName));
    facts.push(can(access, "validate") ? t.directorReads : t.readOnly);
  }
  if (section === "legal")
    facts.push(needs(access, holders, "manage_legal", t.legal));
  if (section === "budget" && !canSeeProjectBudget(access, project))
    facts.push(t.budgetHidden);

  // The step the page shows: done (final), locked or not open yet.
  const s = fr.assistantAccess.step;
  const { journeys } = await loadShellJourneys(id);
  for (const { journey, step } of stepsOfPage(journeys, path)) {
    const place = `${placeOf(journey)} › ${step.title}`;
    if (step.status === "done") facts.push(s.done(place));
    else if (step.status === "blocked") facts.push(s.locked(place));
    else if (step.status === "upcoming") facts.push(s.upcoming(place));
  }
  return { facts, sources };
}

/** A contract's state and what the viewer may do on it, from its rights. */
async function contractFacts(access: Access, id: string): Promise<Result> {
  const t = fr.assistantAccess.contract;
  const contract = await getContract(id, access);
  if (!contract) return { facts: [t.hidden], sources: [] };
  const facts = [
    t.state(
      contract.title,
      fr.contracts.states[contract.state],
      contract.ownerName,
    ),
  ];
  if (!contract.can.edit)
    facts.push(
      contract.status === "in_review"
        ? t.inReview
        : contract.status === "terminated"
          ? t.terminated
          : t.notWriter,
    );
  const allowed = (Object.keys(t.rights) as (keyof typeof t.rights)[]).filter(
    (right) => contract.can[right],
  );
  facts.push(
    allowed.length
      ? t.youMay(allowed.map((right) => t.rights[right]).join(", "))
      : t.nothing,
  );
  return {
    facts,
    sources: [{ label: contract.title, href: routes.contract(id) }],
  };
}

/** Pages whose writing hangs on one permission. */
function pageFacts(
  access: Access,
  holders: PermissionHolders,
  path: string,
): string[] {
  const t = fr.assistantAccess.pages;
  const need = (permission: Permission, what: string) =>
    needs(access, holders, permission, what);
  if (path.startsWith("/app/contracts/templates"))
    return [
      need("manage_legal", t.templates),
      need("validate", t.validateTemplate),
    ];
  if (path.startsWith("/app/contracts"))
    return [need("manage_contracts", t.contracts)];
  if (path.startsWith("/app/catalog"))
    return [need("manage_catalog", t.catalog)];
  if (path.startsWith("/app/network"))
    return [need("manage_network", t.network)];
  if (path.startsWith("/app/sessions"))
    return [need("manage_sessions", t.sessions)];
  if (path.startsWith("/app/members")) return [need("administer", t.members)];
  if (path.startsWith("/app/feedback"))
    return can(access, "read_feedback")
      ? [need("read_feedback", t.feedback)]
      : [t.ownFeedback];
  return [];
}

/**
 * explain_access (docs/ASSISTANT.md § 3 quater): why the viewer may or may
 * not act on the open page, computed from what really decides it (the
 * position's permissions from role_permissions, the project's owner and
 * state, the step done, the contract's rights) and who may act instead.
 * It explains rights, it never widens them: everything is read with the
 * viewer's session.
 */
export async function explainAccess(
  access: Access,
  pagePath: string | null,
): Promise<Result> {
  const t = fr.assistantAccess;
  const holders = await loadPermissionHolders();
  const head = [
    access.role ? t.position(positionLabel(access.role)) : t.noPosition,
    t.allows(access.permissions.map((p) => t.permissions[p] ?? p).join(" ; ")),
  ];
  if (!pagePath) return { facts: [...head, t.noPage], sources: [] };

  const page = pageRecord(pagePath);
  if (page?.kind === "project") {
    const result = await projectFacts(
      access,
      holders,
      pagePath,
      page.id,
      page.section,
    );
    return { facts: [...head, ...result.facts], sources: result.sources };
  }
  const contract = CONTRACT.exec(pagePath);
  if (contract) {
    const result = await contractFacts(access, contract[1]);
    return { facts: [...head, ...result.facts], sources: result.sources };
  }
  return {
    facts: [...head, ...pageFacts(access, holders, pagePath)],
    sources: [],
  };
}
