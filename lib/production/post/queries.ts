import "server-only";

import type { Member } from "@/lib/framing/related";
import { listProductionFiles } from "@/lib/production/files/queries";
import { byTimecode } from "@/lib/production/post/corrections";
import {
  commentCategoryOf,
  commentStatusOf,
  postStepKeyOf,
  postStepStatusOf,
  referenceKindOf,
  versionStatusOf,
} from "@/lib/production/post/rules";
import type {
  PostComment,
  PostFile,
  PostProductionData,
  ShootAlert,
} from "@/lib/production/post/types";
import type { Holder, NetworkOption } from "@/lib/production/sheet";
import { createClient } from "@/lib/supabase/server";

import { loadCorrectionRequests, loadProviderLinks } from "./requests";

// States in which the shoot took place: its report may leave something
// missing for the edit.
const SHOT = new Set(["done", "partial", "interrupted"]);

/**
 * The Postproduction of one sheet, read with the user's session (RLS: whoever
 * sees the project): references, steps, every version with its feedback,
 * what the shoot report left missing, and whether this person reviews
 * (production_can_review: the owner or a creative director, while the stage
 * runs).
 */
export async function loadPostProduction(input: {
  projectId: string;
  sheetId: string;
  members: Member[];
  contacts: NetworkOption[];
}): Promise<PostProductionData> {
  const { projectId, sheetId, members, contacts } = input;
  const supabase = await createClient();
  const [refs, steps, versions, comments, shoot, incidents, review, files] =
    await Promise.all([
      supabase
        .from("production_post_references")
        .select("id, kind, title, url, file_id, note, created_at, created_by")
        .eq("sheet_id", sheetId)
        .order("created_at"),
      supabase
        .from("production_post_steps")
        .select(
          "id, step_key, label, person_id, contact_id, responsibilities, access_note, starts_on, ends_on, status",
        )
        .eq("sheet_id", sheetId)
        .order("position")
        .order("created_at"),
      supabase
        .from("production_versions")
        .select("*")
        .eq("sheet_id", sheetId)
        .order("number", { ascending: false }),
      supabase
        .from("production_version_comments")
        .select(
          "id, version_id, timecode_ms, category, body, file_id, status, status_by, status_at, created_by, created_at, request_id",
        )
        .eq("sheet_id", sheetId),
      supabase
        .from("production_shoots")
        .select(
          "state, missing_sequences, video_rushes, audio_sources, backup_verified",
        )
        .eq("sheet_id", sheetId)
        .maybeSingle(),
      supabase
        .from("production_incidents")
        .select("title")
        .eq("sheet_id", sheetId)
        .eq("blocks_post", true)
        .is("resolved_at", null)
        .order("created_at"),
      supabase.rpc("production_can_review", { p_project_id: projectId }),
      listProductionFiles(supabase, sheetId, [
        "reference",
        "version",
        "attachment",
      ]),
    ]);
  for (const res of [refs, steps, versions, comments, shoot, incidents])
    if (res.error) console.error("loadPostProduction:", res.error.message);

  const fileOf = (id: string | null): PostFile | null => {
    const f = id ? files.find((x) => x.id === id) : null;
    return f ? { id: f.id, fileName: f.fileName, href: f.href } : null;
  };
  const nameOf = (personId: string | null) =>
    personId
      ? (members.find((m) => m.personId === personId)?.name ?? "—")
      : null;
  const holderOf = (
    personId: string | null,
    contactId: string | null,
  ): Holder | null =>
    personId
      ? { kind: "person", id: personId, name: nameOf(personId) ?? "—" }
      : contactId
        ? {
            kind: "contact",
            id: contactId,
            name: contacts.find((c) => c.id === contactId)?.name ?? "—",
          }
        : null;

  const commentsOf = (versionId: string): PostComment[] =>
    (comments.data ?? [])
      .filter((c) => c.version_id === versionId)
      .map((c) => ({
        id: c.id,
        timecodeMs: c.timecode_ms,
        category: commentCategoryOf(c.category) ?? "other",
        body: c.body,
        status: commentStatusOf(c.status) ?? "open",
        statusBy: nameOf(c.status_by),
        statusAt: c.status_at,
        authorName: nameOf(c.created_by) ?? "—",
        createdAt: c.created_at,
        file: fileOf(c.file_id),
        requestId: c.request_id,
      }))
      .sort(byTimecode);

  const versionRows = versions.data ?? [];
  const numberOf = (id: string | null) =>
    id ? (versionRows.find((v) => v.id === id)?.number ?? null) : null;
  const [{ byVersion, reviewers }, providerLinks] = await Promise.all([
    loadCorrectionRequests(supabase, projectId, sheetId, {
      holderOf,
      nameOf,
      numberOf,
    }),
    loadProviderLinks(supabase, sheetId),
  ]);

  const s = shoot.data;
  const shot = s !== null && SHOT.has(s.state);
  const shootAlert: ShootAlert = {
    noVideoRushes: shot && !s.video_rushes,
    noAudioSources: shot && !s.audio_sources,
    noBackup: shot && !s.backup_verified,
    missingSequences: s?.missing_sequences?.trim() || null,
    blockingIncidents: (incidents.data ?? []).map((i) => i.title),
  };
  const alertShows =
    shootAlert.noVideoRushes ||
    shootAlert.noAudioSources ||
    shootAlert.noBackup ||
    shootAlert.missingSequences !== null ||
    shootAlert.blockingIncidents.length > 0;

  return {
    references: (refs.data ?? []).flatMap((r) => {
      const kind = referenceKindOf(r.kind);
      return kind
        ? [
            {
              id: r.id,
              kind,
              title: r.title,
              url: r.url,
              note: r.note,
              file: fileOf(r.file_id),
              createdAt: r.created_at,
              createdBy: nameOf(r.created_by),
            },
          ]
        : [];
    }),
    steps: (steps.data ?? []).flatMap((st) => {
      const key = postStepKeyOf(st.step_key);
      return key
        ? [
            {
              id: st.id,
              key,
              label: st.label,
              holder: holderOf(st.person_id, st.contact_id),
              responsibilities: st.responsibilities,
              accessNote: st.access_note,
              startsOn: st.starts_on,
              endsOn: st.ends_on,
              status: postStepStatusOf(st.status) ?? "todo",
            },
          ]
        : [];
    }),
    versions: versionRows.map((v) => ({
      id: v.id,
      number: v.number,
      label: v.label,
      file: fileOf(v.file_id),
      url: v.url,
      notes: v.notes,
      author: holderOf(v.person_id, v.contact_id),
      status: versionStatusOf(v.status) ?? "draft",
      createdBy: nameOf(v.created_by) ?? "—",
      createdAt: v.created_at,
      submittedBy: nameOf(v.submitted_by),
      submittedAt: v.submitted_at,
      decidedBy: nameOf(v.decided_by),
      decidedAt: v.decided_at,
      decisionNote: v.decision_note,
      comments: commentsOf(v.id),
      previousNumber: numberOf(v.previous_version_id),
      request: byVersion.get(v.id) ?? null,
    })),
    shootAlert: alertShows ? shootAlert : null,
    canReview: review.data === true,
    reviewers,
    providerLinks,
  };
}
