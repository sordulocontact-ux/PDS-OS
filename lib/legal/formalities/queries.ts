import "server-only";

import type { Access } from "@/lib/auth/access";
import type { ContributorRole } from "@/lib/catalog/master/rules";
import {
  SACEM_725,
  type FormalityStatus,
} from "@/lib/legal/formalities/definition";
import {
  prefillSacem725,
  type SplitShare,
} from "@/lib/legal/formalities/prefill";
import type {
  FormalityView,
  TitleFormality,
} from "@/lib/legal/formalities/types";
import { exactShare, unitsOf } from "@/lib/legal/splits/shares";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// The SACEM 725 formality of each title of a project (ticket Juridique 06),
// read with the viewer's session (RLS: manage_legal on a visible project).

const asText = (value: unknown): Record<string, string> =>
  value && typeof value === "object"
    ? Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [
          k,
          String(v ?? ""),
        ]),
      )
    : {};

export async function loadFormalities(
  project: { id: string; masters: Array<{ id: string; title: string }> },
  access: Access,
): Promise<TitleFormality[]> {
  const supabase = await createClient();
  const masterIds = project.masters.map((m) => m.id);
  if (masterIds.length === 0) return [];
  const none = { data: [], error: null };
  const [
    masters,
    performers,
    credits,
    clearances,
    formalities,
    people,
    publishing,
    publisherSplits,
    release,
  ] = await Promise.all([
    supabase
      .from("masters")
      .select("id, title, duration_seconds, audio_state, iswc")
      .in("id", masterIds),
    supabase
      .from("master_artists")
      .select("master_id, artist:artists!master_artists_artist_same_org(name)")
      .in("master_id", masterIds),
    supabase
      .from("master_contributors")
      .select("master_id, name, role, contact_id")
      .in("master_id", masterIds)
      .order("created_at"),
    supabase
      .from("legal_clearances")
      .select("master_id, work, status")
      .eq("project_id", project.id),
    supabase
      .from("legal_formalities")
      .select(
        "id, master_id, status, reopened, partial_reason, submission_proof, submitted_at, completion_proof, completed_at, external_id",
      )
      .eq("project_id", project.id)
      .eq("definition_key", SACEM_725),
    access.organizationId
      ? supabase.rpc("list_legal_people", {
          p_organization_id: access.organizationId,
        })
      : Promise.resolve(none),
    // A signed publishing contract of the project (RLS: the contracts the
    // viewer may read).
    supabase
      .from("contracts")
      .select("title")
      .eq("project_id", project.id)
      .eq("type", "publishing")
      .eq("status", "signed")
      .order("signed_on", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // The publishers of each title's publishing split: their name only.
    supabase
      .from("master_splits")
      .select("master_id, party, contact_id")
      .in("master_id", masterIds)
      .eq("kind", "publishing")
      .eq("role", "publisher")
      .order("share", { ascending: false }),
    // The planned release: the first exploitation proposed (JUR-02).
    supabase
      .from("releases")
      .select("planned_release_date")
      .eq("project_id", project.id)
      .not("planned_release_date", "is", null)
      .order("planned_release_date")
      .limit(1)
      .maybeSingle(),
  ]);
  const contactIds = [
    ...new Set(
      [...(credits.data ?? []), ...(publisherSplits.data ?? [])].flatMap((c) =>
        c.contact_id ? [c.contact_id] : [],
      ),
    ),
  ];
  const fIds = (formalities.data ?? []).map((f) => f.id);
  const [details, values, documents, signatures, events, splits, links] =
    await Promise.all([
      contactIds.length > 0
        ? supabase
            .from("contact_legal_details")
            .select("contact_id, details")
            .in("contact_id", contactIds)
        : Promise.resolve(none),
      fIds.length > 0
        ? supabase
            .from("legal_formality_values")
            .select("formality_id, field_key, value, source, status")
            .in("formality_id", fIds)
        : Promise.resolve(none),
      fIds.length > 0
        ? supabase
            .from("legal_formality_documents")
            .select("formality_id, version, created_at")
            .in("formality_id", fIds)
            .order("version", { ascending: false })
        : Promise.resolve(none),
      fIds.length > 0
        ? supabase
            .from("legal_formality_signatures")
            .select(
              "id, formality_id, document_version, signer, role, status, proof, signed_at, contact_id, via, signed_on, file_path",
            )
            .in("formality_id", fIds)
        : Promise.resolve(none),
      fIds.length > 0
        ? supabase
            .from("legal_formality_events")
            .select("id, formality_id, kind, note, actor_person_id, created_at")
            .in("formality_id", fIds)
            .order("created_at", { ascending: false })
        : Promise.resolve(none),
      confirmedSplits(supabase, masterIds),
      // Who has a private page on this project (/c/): they sign there.
      fIds.length > 0
        ? supabase
            .from("project_contact_links")
            .select("contact_id")
            .eq("project_id", project.id)
            .is("revoked_at", null)
            .gt("expires_at", new Date().toISOString())
        : Promise.resolve(none),
    ]);
  const linked = new Set((links.data ?? []).map((l) => l.contact_id));
  // The signed bulletins deposited by a link: « Voir le PDF », one hour.
  const filed = (signatures.data ?? []).flatMap((s) =>
    s.file_path ? [{ id: s.id, path: s.file_path }] : [],
  );
  const urlOf = new Map<string, string>();
  if (filed.length > 0) {
    const { data } = await supabase.storage
      .from("formality-signatures")
      .createSignedUrls(
        filed.map((f) => f.path),
        3600,
      );
    filed.forEach((f, i) => {
      const url = data?.[i]?.signedUrl;
      if (url) urlOf.set(f.id, url);
    });
  }
  const detailsOf = new Map(
    (details.data ?? []).map((d) => [d.contact_id, asText(d.details)]),
  );
  const nameOf = new Map(
    (people.data ?? []).map((p) => [
      p.person_id,
      personName(p.first_name, p.last_name),
    ]),
  );

  return Promise.all(
    project.masters.map(async (m): Promise<TitleFormality> => {
      const master = (masters.data ?? []).find((x) => x.id === m.id);
      const f = (formalities.data ?? []).find((x) => x.master_id === m.id);
      const prefill = prefillSacem725({
        title: master?.title ?? m.title,
        durationSeconds: master?.duration_seconds ?? null,
        audioState: master?.audio_state ?? null,
        iswc: master?.iswc ?? null,
        performers: (performers.data ?? [])
          .filter((p) => p.master_id === m.id)
          .flatMap((p) => (p.artist?.name ? [p.artist.name] : [])),
        credits: (credits.data ?? [])
          .filter((c) => c.master_id === m.id)
          .map((c) => ({
            name: c.name,
            role: c.role as ContributorRole,
            contactId: c.contact_id,
            details: c.contact_id ? (detailsOf.get(c.contact_id) ?? {}) : {},
          })),
        publishers: (publisherSplits.data ?? [])
          .filter((s) => s.master_id === m.id)
          .map((s) => ({
            name: s.party,
            contactId: s.contact_id,
            details: s.contact_id ? (detailsOf.get(s.contact_id) ?? {}) : {},
          })),
        signedPublishingContract: publishing.data?.title ?? null,
        splitShares: splits.get(m.id) ?? null,
        releaseDate: release.data?.planned_release_date ?? null,
      });
      // Kept for the people added by hand: they take their share too.
      const splitShares = splits.get(m.id) ?? null;
      let formality: FormalityView | null = null;
      if (f) {
        const current = (documents.data ?? []).find(
          (d) => d.formality_id === f.id,
        )?.version;
        const missing =
          (await supabase.rpc("formality_missing", { p_formality_id: f.id }))
            .data ?? [];
        formality = {
          id: f.id,
          status: f.status as FormalityStatus,
          reopened: f.reopened,
          partialReason: f.partial_reason,
          submissionProof: f.submission_proof,
          submittedAt: f.submitted_at,
          completionProof: f.completion_proof,
          completedAt: f.completed_at,
          externalId: f.external_id,
          values: Object.fromEntries(
            (values.data ?? [])
              .filter((v) => v.formality_id === f.id)
              .map((v) => [
                v.field_key,
                {
                  value: v.value,
                  source: v.source,
                  status: v.status as "validated" | "to_verify",
                },
              ]),
          ),
          missing,
          documents: (documents.data ?? [])
            .filter((d) => d.formality_id === f.id)
            .map((d) => ({ version: d.version, at: d.created_at })),
          signatures: (signatures.data ?? [])
            .filter(
              (s) => s.formality_id === f.id && s.document_version === current,
            )
            .map((s) => ({
              id: s.id,
              signer: s.signer,
              role: s.role,
              status: s.status as "pending" | "signed",
              proof: s.proof,
              at: s.signed_at,
              via: (s.via as "link" | "other" | null) ?? null,
              signedOn: s.signed_on,
              onLink: s.contact_id !== null && linked.has(s.contact_id),
              fileUrl: urlOf.get(s.id) ?? null,
            })),
          history: (events.data ?? [])
            .filter((e) => e.formality_id === f.id)
            .map((e) => ({
              id: e.id,
              kind: e.kind,
              note: e.note,
              at: e.created_at,
              by: e.actor_person_id
                ? (nameOf.get(e.actor_person_id) ?? "")
                : "",
            })),
        };
      }
      return {
        masterId: m.id,
        title: m.title,
        prefill,
        splitShares,
        borrowings: (clearances.data ?? [])
          .filter((c) => c.master_id === m.id)
          .map((c) => ({ work: c.work, status: c.status })),
        formality,
      };
    }),
  );
}

/**
 * The confirmed split of each title (Répartitions, branch 04), by master:
 * each line's contact, role and exact share. The bulletin's Phono shares
 * start from it (UX test of 09/10/2026: shares retyped right after the
 * split was confirmed), shown « à vérifier ». The latest version confirmed
 * by everyone, in any project of the title (as on the title's page,
 * lib/legal/splits/title-split.ts): a split confirmed for the EP serves
 * the single's bulletin.
 */
async function confirmedSplits(
  supabase: Awaited<ReturnType<typeof createClient>>,
  masterIds: string[],
): Promise<Map<string, SplitShare[]>> {
  const { data: sheets } = await supabase
    .from("legal_split_sheets")
    .select("id, master_id")
    .in("master_id", masterIds);
  if (!sheets?.length) return new Map();
  const { data: versions } = await supabase
    .from("legal_split_versions")
    .select("id, sheet_id")
    .in(
      "sheet_id",
      sheets.map((s) => s.id),
    )
    .eq("status", "confirmed")
    .order("proposed_at", { ascending: false });
  const masterOfSheet = new Map(sheets.map((s) => [s.id, s.master_id]));
  // The latest confirmed version of each title.
  const latest = new Map<string, string>();
  for (const v of versions ?? []) {
    const master = masterOfSheet.get(v.sheet_id);
    if (master && !latest.has(master)) latest.set(master, v.id);
  }
  if (latest.size === 0) return new Map();
  const masterOfVersion = new Map(
    [...latest].map(([master, version]) => [version, master]),
  );
  const { data: entries } = await supabase
    .from("legal_split_entries")
    .select("version_id, role, share, contact_id")
    .in("version_id", [...latest.values()]);
  const byMaster = new Map<string, SplitShare[]>();
  for (const e of entries ?? []) {
    const master = masterOfVersion.get(e.version_id);
    const units = unitsOf(String(e.share));
    if (!master || units === null) continue;
    byMaster.set(master, [
      ...(byMaster.get(master) ?? []),
      {
        contactId: e.contact_id,
        role: e.role,
        share: exactShare(units).replace(",", "."),
      },
    ]);
  }
  return byMaster;
}
