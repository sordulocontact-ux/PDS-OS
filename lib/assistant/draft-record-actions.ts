"use server";

import { z } from "zod";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { loadBudget } from "@/lib/budget/queries";
import type { BudgetLever } from "@/lib/budget/types";
import { nextRoundHourInput } from "@/lib/calls/format";
import type { ContractType } from "@/lib/contracts/types";
import { loadMembers, type Member } from "@/lib/framing/related";
import {
  getMasterRights,
  listMasterDeclarations,
  listMasterSessions,
  listMasterSplits,
} from "@/lib/catalog/master/queries";
import {
  splitTotal,
  type MasterDeclaration,
  type MasterRights,
  type MasterSession,
  type Organism,
  type SplitKind,
} from "@/lib/catalog/master/rules";
import { listTemplateSeries } from "@/lib/legal/contracts/templates";
import type { FormRole } from "@/lib/legal/forms/definition";

// What PO's review panel needs to show the real form of a record draft
// (draft-records.ts), read with the user's session when it opens.

export type TemplateCurrent = {
  name: string;
  type: ContractType;
  roles: FormRole[];
  usage: string;
  body: string;
  source: { path: string; name: string } | null;
};

export type TemplateFormData = {
  organizationId: string;
  current: TemplateCurrent | null;
};

/** The template form's organization (where a source file goes) and, for a
 * new version, the latest version of the series it starts from. */
export async function loadTemplateForm(
  seriesId: string | null,
): Promise<TemplateFormData | null> {
  const access = await requireApproved();
  if (!can(access, "manage_legal") || !access.organizationId) return null;
  const organizationId = access.organizationId;
  if (!seriesId) return { organizationId, current: null };
  if (!z.uuid().safeParse(seriesId).success) return null;
  const series = (await listTemplateSeries(access)).find(
    (s) => s.seriesId === seriesId,
  );
  return {
    organizationId,
    current: series
      ? {
          name: series.name,
          type: series.type,
          roles: series.roles,
          usage: series.usage ?? "",
          body: series.body,
          source: series.source,
        }
      : null,
  };
}

/** Who a task may go to. */
export async function loadTaskMembers(): Promise<Member[]> {
  return loadMembers(await requireApproved());
}

/** The other members to invite, and the default time of a meeting. */
export async function loadMeetingForm(): Promise<{
  members: Member[];
  defaultOccurredAt: string;
}> {
  const access = await requireApproved();
  const members = (await loadMembers(access)).filter(
    (member) => member.personId !== access.personId,
  );
  return { members, defaultOccurredAt: nextRoundHourInput(new Date()) };
}

/** The project's selected levers, the ones a spend can serve. */
export async function loadBudgetLevers(
  projectId: string,
): Promise<BudgetLever[]> {
  await requireApproved();
  if (!z.uuid().safeParse(projectId).success) return [];
  return (await loadBudget(projectId)).levers;
}

export type TitleItemForm = {
  // A track's sessions to attach it to.
  sessions: MasterSession[];
  // What a new share may take (the kind's remainder, computed by code).
  available: number;
  rights: MasterRights;
  // The declaration already noted for this society: edited, not doubled.
  declaration: MasterDeclaration | null;
};

/** What the title page's form of a title item draft needs. */
export async function loadTitleItemForm(
  masterId: string,
  splitKind: SplitKind,
  organism: Organism | null,
): Promise<TitleItemForm> {
  await requireApproved();
  if (!z.uuid().safeParse(masterId).success) throw new Error("invalid id");
  const [{ sessions }, { splits }, rights, { declarations }] =
    await Promise.all([
      listMasterSessions(masterId),
      listMasterSplits(masterId),
      getMasterRights(masterId),
      listMasterDeclarations(masterId),
    ]);
  return {
    sessions,
    available: splitTotal(splits, splitKind).remaining,
    rights: rights ?? { iswc: null, rightsHolder: null, rightsYear: null },
    declaration: declarations.find((d) => d.organism === organism) ?? null,
  };
}
