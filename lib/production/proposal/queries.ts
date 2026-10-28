import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";

import { createClient } from "@/lib/supabase/server";

import { extOf, sideOf, type ProposalVersion } from "./model";

/**
 * The proposal's versions of a sheet, newest first, with who deposited and
 * who decided by name. Read with the user's session (RLS), once per request.
 */
export const loadProposalVersions = trackedCache(
  async (sheetId: string): Promise<ProposalVersion[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("production_direction_versions")
      .select(
        "id, number, treatment_url, moodboard_url, cutting_url, note, deposited_by_person, deposited_by_contact, deposited_at, int_status, int_by, int_comment, ext_status, ext_contact_id, ext_comment",
      )
      .eq("sheet_id", sheetId)
      .order("number", { ascending: false });
    if (error) {
      console.error("proposal versions:", error.message);
      return [];
    }
    const rows = data ?? [];
    const personIds = [
      ...new Set(
        rows.flatMap((r) =>
          [r.deposited_by_person, r.int_by].filter((x): x is string =>
            Boolean(x),
          ),
        ),
      ),
    ];
    const contactIds = [
      ...new Set(
        rows.flatMap((r) =>
          [r.deposited_by_contact, r.ext_contact_id].filter((x): x is string =>
            Boolean(x),
          ),
        ),
      ),
    ];
    const [people, contacts] = await Promise.all([
      personIds.length
        ? supabase
            .from("people")
            .select("id, first_name, last_name")
            .in("id", personIds)
        : null,
      contactIds.length
        ? supabase
            .from("network_contacts")
            .select("id, name")
            .in("id", contactIds)
        : null,
    ]);
    const person = (id: string | null) => {
      const p = people?.data?.find((x) => x.id === id);
      return p ? [p.first_name, p.last_name].filter(Boolean).join(" ") : null;
    };
    const contact = (id: string | null) =>
      contacts?.data?.find((x) => x.id === id)?.name ?? null;
    return rows.map((r) => ({
      id: r.id,
      number: r.number,
      treatmentUrl: r.treatment_url,
      moodboardUrl: r.moodboard_url,
      cuttingUrl: r.cutting_url,
      note: r.note,
      depositedBy:
        contact(r.deposited_by_contact) ?? person(r.deposited_by_person) ?? "—",
      depositedAt: r.deposited_at,
      int: sideOf(r.int_status),
      intBy: person(r.int_by),
      intComment: r.int_comment,
      ext: extOf(r.ext_status),
      extBy: contact(r.ext_contact_id),
      extComment: r.ext_comment,
    }));
  },
);
