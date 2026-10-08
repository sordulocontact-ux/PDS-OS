import "server-only";

import type { Access } from "@/lib/auth/access";
import type { ContributorRole } from "@/lib/catalog/master/rules";
import {
  SACEM_725,
  type FormalityStatus,
} from "@/lib/legal/formalities/definition";
import { prefillSacem725 } from "@/lib/legal/formalities/prefill";
import type {
  FormalityView,
  TitleFormality,
} from "@/lib/legal/formalities/types";
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
      .order("position"),
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
  ]);
  const contactIds = [
    ...new Set(
      [...(credits.data ?? []), ...(publisherSplits.data ?? [])].flatMap((c) =>
        c.contact_id ? [c.contact_id] : [],
      ),
    ),
  ];
  const fIds = (formalities.data ?? []).map((f) => f.id);
  const [details, values, documents, signatures, events] = await Promise.all([
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
            "id, formality_id, document_version, signer, role, status, proof, signed_at",
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
  ]);
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
      });
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
        borrowings: (clearances.data ?? [])
          .filter((c) => c.master_id === m.id)
          .map((c) => ({ work: c.work, status: c.status })),
        formality,
      };
    }),
  );
}
