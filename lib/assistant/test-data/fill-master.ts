import "server-only";

import {
  FAKE_TRACKS,
  fakeContributors,
  fakeIsrc,
  fakeSessions,
} from "@/lib/assistant/test-data/fake-master";
import { fillMasterFiles } from "@/lib/assistant/test-data/master-files";
import { fillMasterRights } from "@/lib/assistant/test-data/master-rights";
import {
  insertProject,
  logged,
  pickManager,
  type Supabase,
} from "@/lib/assistant/test-data/writes";
import { can, type Access } from "@/lib/auth/access";
import { listMasterVariantIds } from "@/lib/catalog/master/related";
import type { MasterDetail } from "@/lib/catalog/types";

/**
 * Fills every empty section of a title's page with fake data
 * (docs/ASSISTANT.md § 3 ter). A section that already holds data is left
 * alone: nothing is replaced or duplicated. Each step says whether it was
 * filled (true), failed (false) or skipped because already filled (null).
 */

export type MasterSection =
  | "core"
  | "sessions"
  | "credits"
  | "masterSplits"
  | "publishingSplits"
  | "rights"
  | "declarations"
  | "variant"
  | "project"
  | "audio"
  | "artwork";

export type Step = boolean | null;

export async function fillMaster(
  supabase: Supabase,
  access: Access,
  master: MasterDetail,
): Promise<Partial<Record<MasterSection, Step>>> {
  const organizationId = access.organizationId!;
  const id = master.id;
  const rows = (table: "master_sessions" | "master_contributors") =>
    supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("master_id", id);
  const steps: Partial<Record<MasterSection, Step>> = {};
  const artist =
    master.credits.find((c) => c.role === "main")?.name ?? master.artists;
  const durationSeconds = master.durationSeconds ?? 187;

  // The title itself: ISRC, duration, audio state (update_master, full credits).
  steps.core =
    master.isrc && master.durationSeconds && master.audioState
      ? null
      : logged(
          await supabase.rpc("update_master", {
            p_master_id: id,
            p_title: master.title,
            p_credits: master.credits.map((c) => ({
              artist_id: c.artistId,
              role: c.role,
            })),
            p_variant: master.variant,
            p_variant_label: master.variantLabel ?? undefined,
            p_audio_state: master.audioState ?? "master",
            p_isrc: master.isrc ?? fakeIsrc(),
            p_duration_seconds: durationSeconds,
          }),
          "core",
        );

  if ((await rows("master_sessions")).count) steps.sessions = null;
  else {
    const { data, error } = await supabase
      .from("master_sessions")
      .insert(
        fakeSessions().map((s) => ({
          ...s,
          organization_id: organizationId,
          master_id: id,
        })),
      )
      .select("id, kind");
    const recording = data?.find((s) => s.kind === "recording")?.id ?? null;
    steps.sessions =
      logged({ error }, "sessions") &&
      logged(
        await supabase.from("master_tracks").insert(
          FAKE_TRACKS.map((name) => ({
            name,
            performer: name === "Voix lead" ? artist : null,
            session_id: recording,
            organization_id: organizationId,
            master_id: id,
          })),
        ),
        "tracks",
      );
  }

  steps.credits = (await rows("master_contributors")).count
    ? null
    : logged(
        await supabase.from("master_contributors").insert(
          fakeContributors().map((c) => ({
            ...c,
            organization_id: organizationId,
            master_id: id,
          })),
        ),
        "contributors",
      );

  Object.assign(
    steps,
    await fillMasterRights(supabase, organizationId, id, artist),
  );

  // A variant: same title, same artists, decided by code (related.ts).
  const variants = await listMasterVariantIds(master);
  steps.variant =
    variants.ids.length || variants.error
      ? null
      : logged(
          await supabase.rpc("create_master", {
            p_organization_id: organizationId,
            p_title: master.title,
            p_credits: master.credits.map((c) => ({
              artist_id: c.artistId,
              role: c.role,
            })),
            p_variant: "instrumental",
            p_audio_state: "master",
            p_duration_seconds: durationSeconds,
          }),
          "variant",
        );

  if (master.projects.length) steps.project = null;
  else if (can(access, "create_projects")) {
    const manager = await pickManager(access);
    steps.project =
      !!manager &&
      !!(await insertProject(supabase, {
        organizationId,
        type: "music_release",
        format: "single",
        masters: [{ id, name: master.title }],
        manager,
      }));
  }

  Object.assign(
    steps,
    await fillMasterFiles(supabase, organizationId, master, durationSeconds),
  );

  return steps;
}
