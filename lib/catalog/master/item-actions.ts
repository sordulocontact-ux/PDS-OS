"use server";

import {
  afterWrite,
  catalogOrganization,
  parseMasterForm,
  refreshMaster,
} from "@/lib/catalog/master/action-helpers";
import type {
  MasterFormState,
  MasterItemSection,
} from "@/lib/catalog/master/rules";
import {
  contributorSchema,
  deleteItemSchema,
  sessionSchema,
  trackSchema,
} from "@/lib/catalog/master/schemas";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

// Sessions, tracks and contributors of a master: added or edited from a
// modal, deleted after confirmation. RLS and column grants decide.

export async function saveSession(
  _previous: MasterFormState,
  formData: FormData,
): Promise<MasterFormState> {
  const parsed = await parseMasterForm(sessionSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { masterId, itemId, date, ...fields } = parsed.data;
  const row = { ...fields, session_date: date };
  const supabase = await createClient();
  const { error } = itemId
    ? await supabase
        .from("master_sessions")
        .update(row)
        .eq("id", itemId)
        .eq("master_id", masterId)
    : await supabase.from("master_sessions").insert({
        ...row,
        organization_id: parsed.organizationId,
        master_id: masterId,
      });
  return afterWrite("saveSession", masterId, formData, error);
}

export async function saveTrack(
  _previous: MasterFormState,
  formData: FormData,
): Promise<MasterFormState> {
  const parsed = await parseMasterForm(trackSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { masterId, itemId, sessionId, name, performer } = parsed.data;
  const row = { name, performer, session_id: sessionId };
  const supabase = await createClient();
  const { error } = itemId
    ? await supabase
        .from("master_tracks")
        .update(row)
        .eq("id", itemId)
        .eq("master_id", masterId)
    : await supabase.from("master_tracks").insert({
        ...row,
        organization_id: parsed.organizationId,
        master_id: masterId,
      });
  return afterWrite("saveTrack", masterId, formData, error);
}

export async function saveContributor(
  _previous: MasterFormState,
  formData: FormData,
): Promise<MasterFormState> {
  const parsed = await parseMasterForm(contributorSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { masterId, itemIds, name, roles, detail, contactId } = parsed.data;
  const supabase = await createClient();
  // One row per role, kept, removed or added in one transaction.
  const { error } = await supabase.rpc("set_master_contributor_roles", {
    p_master_id: masterId,
    p_item_ids: itemIds,
    p_name: name,
    p_contact_id: contactId,
    p_roles: roles,
    p_detail: detail,
  });
  return afterWrite("saveContributor", masterId, formData, error);
}

const TABLES = {
  session: "master_sessions",
  track: "master_tracks",
  contributor: "master_contributors",
  split: "master_splits",
  declaration: "master_declarations",
} as const satisfies Record<MasterItemSection, string>;

/** Deletes a row of one of the master's lists. */
export async function deleteMasterItem(input: {
  masterId: string;
  section: MasterItemSection;
  itemId: string;
  alsoIds?: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = deleteItemSchema.safeParse(input);
  if (!parsed.success || !(await catalogOrganization()))
    return { ok: false, error: fr.auth.errors.forbidden };
  const { masterId, section, itemId, alsoIds = [] } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLES[section])
    .delete()
    .in("id", [itemId, ...alsoIds])
    .eq("master_id", masterId)
    .select("id");
  if (error || !data?.length) {
    if (error) console.error("deleteMasterItem:", error.message);
    return { ok: false, error: fr.masterPage.deleteFailed };
  }
  refreshMaster(masterId);
  return { ok: true };
}
