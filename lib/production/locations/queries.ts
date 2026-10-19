import "server-only";

import type { Access } from "@/lib/auth/access";
import { listProductionFiles } from "@/lib/production/files/queries";
import type { ProductionSheetData } from "@/lib/production/sheet";
import { createClient } from "@/lib/supabase/server";

import {
  holderKey,
  LOCATION_ROLES,
  VERDICTS,
  type LocationRole,
  type LocationsData,
  type Verdict,
} from "./types";

const roleOf = (v: string): LocationRole =>
  LOCATION_ROLES.find((r) => r === v) ?? "production";
const verdictOf = (v: string): Verdict =>
  VERDICTS.find((r) => r === v) ?? "reserved";

/** The sheet's candidate places, media, consulted people and opinions, read
 * with the user's session (PROD-011 to PROD-013). */
export async function loadLocations(
  sheetId: string,
  data: Pick<ProductionSheetData, "members" | "contacts">,
  access: Access,
): Promise<LocationsData> {
  const supabase = await createClient();
  const [options, media, consults, reviews, files] = await Promise.all([
    supabase
      .from("production_location_options")
      .select("*")
      .eq("sheet_id", sheetId)
      .order("position")
      .order("created_at"),
    supabase
      .from("production_location_media")
      .select("*")
      .eq("sheet_id", sheetId),
    supabase
      .from("production_location_consults")
      .select("*")
      .eq("sheet_id", sheetId),
    supabase
      .from("production_location_reviews")
      .select("*")
      .eq("sheet_id", sheetId)
      .order("updated_at", { ascending: false }),
    listProductionFiles(supabase, sheetId, ["location"]),
  ]);
  for (const res of [options, media, consults, reviews])
    if (res.error) console.error("loadLocations:", res.error.message);

  const personName = (id: string | null) =>
    id ? (data.members.find((m) => m.personId === id)?.name ?? "—") : null;
  const holderOf = (person: string | null, contact: string | null) =>
    person
      ? { kind: "person" as const, id: person, name: personName(person) ?? "—" }
      : contact
        ? {
            kind: "contact" as const,
            id: contact,
            name: data.contacts.find((c) => c.id === contact)?.name ?? "—",
          }
        : null;

  const consultRows = (consults.data ?? []).flatMap((c) => {
    const holder = holderOf(c.person_id, c.contact_id);
    return holder ? [{ id: c.id, holder, role: roleOf(c.role) }] : [];
  });
  const mine = consultRows.find(
    (c) => c.holder.kind === "person" && c.holder.id === access.personId,
  );
  return {
    consults: consultRows,
    viewerRole: mine?.role ?? null,
    viewerKey: mine ? holderKey(mine.holder) : null,
    options: (options.data ?? []).map((o) => ({
      id: o.id,
      name: o.name,
      address: o.address,
      url: o.url,
      contactNote: o.contact_note,
      priceCents: o.price_cents,
      priceNote: o.price_note,
      availability: o.availability,
      constraints: o.constraints,
      verification: o.verification === "verified" ? "verified" : "to_verify",
      status:
        o.status === "chosen" ||
        o.status === "discarded" ||
        o.status === "replaced"
          ? o.status
          : "candidate",
      decisionReason: o.decision_reason,
      decidedBy: personName(o.decided_by),
      decidedAt: o.decided_at,
      media: (media.data ?? [])
        .filter((m) => m.option_id === o.id)
        .map((m) => {
          const f = m.file_id ? files.find((x) => x.id === m.file_id) : null;
          return {
            id: m.id,
            url: m.url,
            file: f
              ? { fileName: f.fileName, href: f.href, mime: f.mime }
              : null,
          };
        }),
      reviews: (reviews.data ?? [])
        .filter((r) => r.option_id === o.id)
        .flatMap((r) => {
          const holder = holderOf(r.person_id, r.contact_id);
          return holder
            ? [
                {
                  id: r.id,
                  who: holder.name,
                  holderKey: holderKey(holder),
                  role: roleOf(r.role),
                  verdict: verdictOf(r.verdict),
                  comment: r.comment,
                  at: r.updated_at,
                },
              ]
            : [];
        }),
    })),
  };
}
