import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";

import { PRODUCTION_FILE_BUCKET } from "@/lib/production/files/rules";
import { versionStatusOf } from "@/lib/production/post/rules";
import { extOf } from "@/lib/production/proposal/model";
import { createClient } from "@/lib/supabase/server";

import type { DeliveryRecipient, LightFacts } from "./types";

const SIGNED_SECONDS = 3600;
const PURPOSES = ["distribution", "activations", "validation"] as const;

/**
 * What a light journey reads (PR-13), and the delivery of every
 * deliverable: the versions with their file (signed for an hour), the
 * three decisions of the delivery, its last recipients, and for teasers
 * drawn from the clip whether the clip's edit is validated. Read with the
 * user's session, once per request.
 */
export const loadLightFacts = trackedCache(
  async (
    sheetId: string,
    deliverableId: string,
    derivedFrom: string | null,
  ): Promise<LightFacts> => {
    const supabase = await createClient();
    const [versions, delivery, recipients, source] = await Promise.all([
      supabase
        .from("production_versions")
        .select(
          "id, number, status, url, file_id, image_width, image_height, decision_note, created_at, submitted_at, person_id, contact_id, decided_by, int_approved_at, ext_status",
        )
        .eq("sheet_id", sheetId)
        .neq("status", "draft")
        .order("number", { ascending: false }),
      supabase
        .from("deliverable_deliveries")
        .select(
          "approved_at, checked_at, checked_by, delivered_at, delivered_by, version_id, final_url",
        )
        .eq("deliverable_id", deliverableId)
        .maybeSingle(),
      supabase
        .from("production_delivery_recipients")
        .select("delivered_at, person_id, contact_id, name, purpose")
        .eq("sheet_id", sheetId)
        .order("delivered_at", { ascending: false })
        .limit(30),
      derivedFrom ? loadSource(derivedFrom) : null,
    ]);
    if (versions.error)
      console.error("loadLightFacts:", versions.error.message);
    const rows = versions.data ?? [];
    const people = [
      ...new Set(
        [
          ...rows.flatMap((r) => [r.person_id, r.decided_by]),
          delivery.data?.checked_by,
          delivery.data?.delivered_by,
          ...(recipients.data ?? []).map((r) => r.person_id),
        ].filter((x): x is string => Boolean(x)),
      ),
    ];
    const contacts = [
      ...new Set(
        [
          ...rows.map((r) => r.contact_id),
          ...(recipients.data ?? []).map((r) => r.contact_id),
        ].filter((x): x is string => Boolean(x)),
      ),
    ];
    const fileIds = rows.flatMap((r) => (r.file_id ? [r.file_id] : []));
    const [peopleRes, contactsRes, filesRes] = await Promise.all([
      people.length
        ? supabase
            .from("people")
            .select("id, first_name, last_name")
            .in("id", people)
        : null,
      contacts.length
        ? supabase
            .from("network_contacts")
            .select("id, name")
            .in("id", contacts)
        : null,
      fileIds.length
        ? supabase
            .from("production_files")
            .select("id, path, file_name, mime, bytes")
            .in("id", fileIds)
        : null,
    ]);
    const person = (id: string | null | undefined) => {
      const p = peopleRes?.data?.find((x) => x.id === id);
      return p ? [p.first_name, p.last_name].filter(Boolean).join(" ") : null;
    };
    const contact = (id: string | null | undefined) =>
      contactsRes?.data?.find((x) => x.id === id)?.name ?? null;
    const bucket = supabase.storage.from(PRODUCTION_FILE_BUCKET);
    const list = await Promise.all(
      rows.map(async (r) => {
        const f = filesRes?.data?.find((x) => x.id === r.file_id) ?? null;
        const signed = f
          ? await bucket.createSignedUrl(f.path, SIGNED_SECONDS)
          : null;
        return {
          id: r.id,
          number: r.number,
          status: versionStatusOf(r.status) ?? "in_review",
          url: r.url,
          file: f
            ? {
                name: f.file_name,
                mime: f.mime,
                bytes: f.bytes,
                href: signed?.data?.signedUrl ?? null,
              }
            : null,
          width: r.image_width,
          height: r.image_height,
          depositedBy: contact(r.contact_id) ?? person(r.person_id) ?? "—",
          depositedAt: r.submitted_at ?? r.created_at,
          decidedBy: person(r.decided_by),
          decisionNote: r.decision_note,
          intApproved: r.int_approved_at !== null || r.status === "approved",
          ext: extOf(r.ext_status),
        };
      }),
    );
    const last = recipients.data?.[0]?.delivered_at ?? null;
    const latestRecipients: DeliveryRecipient[] = (recipients.data ?? [])
      .filter((r) => r.delivered_at === last)
      .map((r) => ({
        name: person(r.person_id) ?? contact(r.contact_id) ?? r.name ?? "—",
        personId: r.person_id,
        purpose: PURPOSES.find((p) => p === r.purpose) ?? null,
      }));
    const d = delivery.data;
    const src = source;
    return {
      versions: list,
      delivery: d
        ? {
            approvedAt: d.approved_at,
            checkedAt: d.checked_at,
            checkedBy: person(d.checked_by),
            deliveredAt: d.delivered_at,
            deliveredBy: person(d.delivered_by),
            versionId: d.version_id,
            finalUrl: d.final_url,
          }
        : null,
      recipients: latestRecipients,
      source: src,
    };
  },
);

/** The clip a teaser is drawn from: its title, its edit validated or not. */
async function loadSource(
  sheetId: string,
): Promise<{ title: string; cutApproved: boolean } | null> {
  const supabase = await createClient();
  const [sheet, approved] = await Promise.all([
    supabase
      .from("production_sheets")
      .select("deliverable_id")
      .eq("id", sheetId)
      .maybeSingle(),
    supabase
      .from("production_versions")
      .select("id", { count: "exact", head: true })
      .eq("sheet_id", sheetId)
      .eq("status", "approved"),
  ]);
  if (!sheet.data) return null;
  const { data } = await supabase
    .from("strategy_deliverables")
    .select("title")
    .eq("id", sheet.data.deliverable_id)
    .maybeSingle();
  return { title: data?.title ?? "—", cutApproved: (approved.count ?? 0) > 0 };
}
