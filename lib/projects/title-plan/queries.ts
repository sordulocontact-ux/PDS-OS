import "server-only";

import type { Access } from "@/lib/auth/access";
import { listMasterCovers } from "@/lib/catalog/covers";
import { FILE_BUCKETS } from "@/lib/catalog/file-rules";
import { signArtistPictures } from "@/lib/catalog/pictures";
import { loadMembers, type Member } from "@/lib/framing/related";
import { canEditProject } from "@/lib/projects/edit-access";
import { sourcesFor, type PlanAction } from "@/lib/projects/title-plan/build";
import {
  changedSince,
  hasChanges,
  sourcesOf,
  titlePlanConfigOf,
  titlePlanStatusOf,
  type TitlePlanConfig,
  type TitlePlanStatus,
} from "@/lib/projects/title-plan/model";
import { scopeOf, loadTitleScopes } from "@/lib/projects/title-scopes";
import { titleScopeCovers } from "@/lib/projects/title-scope-rules";
import { masterNameOf, projectTitleLabel } from "@/lib/projects/title-rules";
import { loadProjectTitles } from "@/lib/projects/titles";
import type { ProjectDetail } from "@/lib/projects/types";
import { deliverableTitle } from "@/lib/strategy/deliverable-title";
import {
  visualKey,
  type Visual,
} from "@/lib/strategy/documents/release-plan-model";
import { VISUALS_BUCKET } from "@/lib/strategy/documents/release-plan-sources";
import { loadStrategy } from "@/lib/strategy/queries";
import { createClient } from "@/lib/supabase/server";

// A title's Plan de sortie (lot 14), read with the viewer's session (RLS):
// the plans of a collective, one per title, and one plan with what it reads
// — the title, its artists, its release (lot 13), the marketing actions that
// concern it (lot 10), the images it may show, its versions and journal.

const SIGNED_URL_SECONDS = 3600;

type ReleaseRow = {
  project_title_id: string | null;
  planned_release_date: string | null;
  delivered_on: string | null;
  online_detected_at: string | null;
  online_confirmed_on: string | null;
};

export type ReleaseState = "planned" | "delivered" | "online";

const stateOf = (r: ReleaseRow): ReleaseState =>
  r.online_confirmed_on || r.online_detected_at
    ? "online"
    : r.delivered_on
      ? "delivered"
      : "planned";

/** Every marketing action of the project (Stratégie deliverables, and the
 * activations that are not a deliverable's), with the titles they target. */
async function loadActions(projectId: string) {
  const supabase = await createClient();
  const [deliverables, activations, scopes] = await Promise.all([
    supabase
      .from("strategy_deliverables")
      .select("id, title, quantity, due_date, assignee_person_id")
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("marketing_activations")
      .select("id, title, due_on, starts_on, owner_person_id, status")
      .eq("project_id", projectId)
      .is("deliverable_id", null)
      .neq("status", "cancelled")
      .order("created_at"),
    loadTitleScopes(projectId),
  ]);
  if (deliverables.error)
    console.error("title plan deliverables:", deliverables.error.message);
  if (activations.error)
    console.error("title plan activations:", activations.error.message);
  return {
    deliverables: deliverables.data ?? [],
    activations: activations.data ?? [],
    scopes,
  };
}

type Actions = Awaited<ReturnType<typeof loadActions>>;

/** The actions of a title's plan: those targeted on it (dedicated), those of
 * the whole project or all its titles (global); « no title » never. */
function actionsOf(all: Actions, titleId: string): PlanAction[] {
  const out: PlanAction[] = [];
  const kindOf = (scope: { kind: string }) =>
    scope.kind === "titles" ? true : false;
  for (const d of all.deliverables) {
    const scope = all.scopes
      ? scopeOf(all.scopes.deliverables, d.id)
      : { kind: "project" as const, titleIds: [] };
    if (!titleScopeCovers(scope, titleId)) continue;
    out.push({
      key: `d:${d.id}`,
      kind: "deliverable",
      title: deliverableTitle(d.title, d.quantity),
      date: d.due_date,
      ownerId: d.assignee_person_id,
      dedicated: kindOf(scope),
    });
  }
  for (const a of all.activations) {
    const scope = all.scopes
      ? scopeOf(all.scopes.activations, a.id)
      : { kind: "project" as const, titleIds: [] };
    if (!titleScopeCovers(scope, titleId)) continue;
    out.push({
      key: `a:${a.id}`,
      kind: "activation",
      title: a.title,
      date: a.due_on ?? a.starts_on,
      ownerId: a.owner_person_id,
      dedicated: kindOf(scope),
    });
  }
  return out;
}

/** The releases of the collective and its mode: a title's target date is
 * its own release's, or the compilation's in « compilation » mode. */
async function loadReleases(projectId: string) {
  const supabase = await createClient();
  const [releases, project] = await Promise.all([
    supabase
      .from("releases")
      .select(
        "project_title_id, planned_release_date, delivered_on, online_detected_at, online_confirmed_on, created_at",
      )
      .eq("project_id", projectId)
      .is("archived_at", null)
      .order("created_at"),
    supabase
      .from("projects")
      .select("collective_release_mode")
      .eq("id", projectId)
      .maybeSingle(),
  ]);
  if (releases.error)
    console.error("title plan releases:", releases.error.message);
  const rows = releases.data ?? [];
  const compilationOnly =
    project.data?.collective_release_mode === "compilation";
  return (titleId: string) => {
    const release = compilationOnly
      ? rows.find((r) => r.project_title_id === null)
      : rows.find((r) => r.project_title_id === titleId);
    return {
      single: !compilationOnly,
      date: release?.planned_release_date ?? null,
      state: release ? stateOf(release) : null,
    };
  };
}

const labelOf = (t: Awaited<ReturnType<typeof loadProjectTitles>>[number]) =>
  projectTitleLabel({
    position: t.position,
    workingTitle: t.workingTitle,
    masterTitle: masterNameOf(t.master),
  });

// ---------------------------------------------------------------------------
// The list
// ---------------------------------------------------------------------------

export type TitlePlanRow = {
  titleId: string;
  label: string;
  abandoned: boolean;
  status: TitlePlanStatus;
  date: string | null;
  version: number | null;
  // An action changed since its latest version.
  changed: boolean;
};

export async function loadTitlePlans(
  project: ProjectDetail,
): Promise<TitlePlanRow[]> {
  const supabase = await createClient();
  const [titles, plans, versions, actions, releaseOf] = await Promise.all([
    loadProjectTitles(project.id),
    supabase
      .from("title_release_plans")
      .select("id, title_id, status")
      .eq("project_id", project.id),
    supabase
      .from("title_release_plan_versions")
      .select("plan_id, version, sources")
      .eq("project_id", project.id)
      .order("version", { ascending: false }),
    loadActions(project.id),
    loadReleases(project.id),
  ]);
  if (plans.error) throw new Error(`loadTitlePlans: ${plans.error.message}`);
  if (versions.error)
    console.error("loadTitlePlans versions:", versions.error.message);
  return titles.flatMap((title) => {
    const plan = (plans.data ?? []).find((p) => p.title_id === title.id);
    if (!plan) return [];
    const latest = (versions.data ?? []).find((v) => v.plan_id === plan.id);
    const status = titlePlanStatusOf(plan.status);
    return [
      {
        titleId: title.id,
        label: labelOf(title),
        abandoned: title.status === "abandoned",
        status,
        date: releaseOf(title.id).date,
        version: latest?.version ?? null,
        changed:
          !!latest &&
          status !== "archived" &&
          hasChanges(
            changedSince(
              sourcesOf(latest.sources),
              sourcesFor(actionsOf(actions, title.id)),
            ),
          ),
      },
    ];
  });
}

// ---------------------------------------------------------------------------
// One plan
// ---------------------------------------------------------------------------

export type PlanVisual = {
  key: string;
  visual: Visual;
  name: string;
  // To show it in the app (signed, short-lived; never stored).
  previewUrl: string;
  group: "cover" | "artist" | "project" | "uploads";
};

export type PlanVersion = {
  id: string;
  version: number;
  status: "internal" | "revised";
  note: string | null;
  by: string | null;
  at: string;
  linkLive: boolean;
};

export type PlanEvent = {
  id: string;
  from: TitlePlanStatus | null;
  to: TitlePlanStatus;
  reason: string | null;
  note: string | null;
  version: number | null;
  by: string | null;
  at: string;
};

export type TitlePlanDetail = {
  planId: string;
  titleId: string;
  label: string;
  titleAbandoned: boolean;
  status: TitlePlanStatus;
  archivedReason: "title_abandoned" | "closed" | null;
  // The status an archived plan gets back when reopened.
  statusBefore: TitlePlanStatus | null;
  config: TitlePlanConfig;
  canEdit: boolean;
  artist: { id: string | null; name: string };
  guests: string[];
  // The title's participations not confirmed yet (internal).
  pending: Array<{ name: string; status: string }>;
  release: { single: boolean; date: string | null; state: ReleaseState | null };
  actions: PlanAction[];
  visuals: PlanVisual[];
  defaultCover: string | null;
  versions: PlanVersion[];
  events: PlanEvent[];
  // Since the latest version: the actions added, removed or changed.
  changes: ReturnType<typeof changedSince> | null;
  members: Member[];
  strategy: {
    objective: string | null;
    audience: string | null;
    message: string | null;
  };
  generatedBy: string;
};

export async function loadTitlePlan(
  project: ProjectDetail,
  titleId: string,
  access: Access,
): Promise<TitlePlanDetail | null> {
  const supabase = await createClient();
  const [titles, planRow, actions, releaseOf, members, strategy, artistRow] =
    await Promise.all([
      loadProjectTitles(project.id),
      supabase
        .from("title_release_plans")
        .select("id, status, status_before_archive, archived_reason, config")
        .eq("project_id", project.id)
        .eq("title_id", titleId)
        .maybeSingle(),
      loadActions(project.id),
      loadReleases(project.id),
      loadMembers(access),
      loadStrategy(project.id, access),
      project.artistId
        ? supabase
            .from("artists")
            .select("id, name, picture_path, picture_url")
            .eq("id", project.artistId)
            .maybeSingle()
        : null,
    ]);
  const title = titles.find((t) => t.id === titleId);
  if (!title || !planRow.data) return null;
  const plan = planRow.data;
  const config = titlePlanConfigOf(plan.config);
  const [versions, events, links] = await Promise.all([
    supabase
      .from("title_release_plan_versions")
      .select("id, version, status, note, created_by, created_at, sources")
      .eq("plan_id", plan.id)
      .order("version", { ascending: false }),
    supabase
      .from("title_release_plan_events")
      .select(
        "id, from_status, to_status, reason, note, version_id, created_by, created_at",
      )
      .eq("plan_id", plan.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("share_links")
      .select("title_plan_version_id, expires_at")
      .eq("project_id", project.id)
      .eq("scope", "title_release_plan")
      .is("revoked_at", null),
  ]);
  if (versions.error)
    console.error("loadTitlePlan versions:", versions.error.message);
  if (events.error)
    console.error("loadTitlePlan events:", events.error.message);
  const name = (id: string | null) =>
    id ? (members.find((m) => m.personId === id)?.name ?? null) : null;
  const now = Date.now();
  const live = new Set(
    (links.data ?? [])
      .filter((l) => !l.expires_at || Date.parse(l.expires_at) > now)
      .map((l) => l.title_plan_version_id),
  );
  const planActions = actionsOf(actions, titleId);
  const versionList = versions.data ?? [];
  const latest = versionList[0];

  // Its artists: the project's main artist, the confirmed guests of this
  // title; those not confirmed yet are named for the team only.
  const active = title.participations.filter(
    (p) => p.status !== "declined" && p.status !== "withdrawn",
  );
  const confirmed = active.filter((p) => p.status === "confirmed");
  const mainName = artistRow?.data?.name ?? project.artistName;
  const coMain = confirmed
    .filter((p) => p.role === "main" && p.artist.id !== project.artistId)
    .map((p) => p.artist.name);
  const guests = confirmed
    .filter((p) => p.role !== "main" && p.artist.id !== project.artistId)
    .map((p) => p.artist.name);

  const visuals = await planVisuals(project.id, {
    masterId: title.master?.id ?? null,
    artistIds: [
      ...(project.artistId ? [project.artistId] : []),
      ...confirmed.map((p) => p.artist.id),
    ],
    config,
  });
  const defaultCover =
    visuals.find((v) => v.group === "cover")?.key ??
    (project.artistId ? `artist_picture:${project.artistId}` : null);

  const field = (key: string) =>
    strategy?.fields.find((f) => f.key === key && f.status === "confirmed")
      ?.value ?? null;

  return {
    planId: plan.id,
    titleId,
    label: labelOf(title),
    titleAbandoned: title.status === "abandoned",
    status: titlePlanStatusOf(plan.status),
    archivedReason:
      plan.archived_reason === "title_abandoned" ||
      plan.archived_reason === "closed"
        ? plan.archived_reason
        : null,
    statusBefore: plan.status_before_archive
      ? titlePlanStatusOf(plan.status_before_archive)
      : null,
    config,
    canEdit: canEditProject(access, project),
    artist: {
      id: project.artistId,
      name: [mainName, ...coMain].filter(Boolean).join(" & "),
    },
    guests,
    pending: active
      .filter((p) => p.status !== "confirmed")
      .map((p) => ({ name: p.artist.name, status: p.status })),
    release: releaseOf(titleId),
    actions: planActions,
    visuals,
    defaultCover: visuals.some((v) => v.key === defaultCover)
      ? defaultCover
      : null,
    versions: versionList.map((v) => ({
      id: v.id,
      version: v.version,
      status: v.status === "revised" ? "revised" : "internal",
      note: v.note,
      by: name(v.created_by),
      at: v.created_at,
      linkLive: live.has(v.id),
    })),
    events: (events.data ?? []).map((e) => ({
      id: e.id,
      from: e.from_status ? titlePlanStatusOf(e.from_status) : null,
      to: titlePlanStatusOf(e.to_status),
      reason: e.reason,
      note: e.note,
      version: versionList.find((v) => v.id === e.version_id)?.version ?? null,
      by: name(e.created_by),
      at: e.created_at,
    })),
    changes: latest
      ? changedSince(sourcesOf(latest.sources), sourcesFor(planActions))
      : null,
    members,
    strategy: {
      objective:
        strategy?.strategicObjective.status === "confirmed"
          ? (strategy.strategicObjective.value ?? null)
          : null,
      audience: field("audiences"),
      message: field("narrative"),
    },
    generatedBy: project.ownerName ?? "",
  };
}

/**
 * The images a title's plan may show: the title's cover (Catalogue), the
 * pictures of its artists, the project's image files, the images dropped in
 * the plan; each with a URL to show it in the app.
 */
async function planVisuals(
  projectId: string,
  input: {
    masterId: string | null;
    artistIds: string[];
    config: TitlePlanConfig;
  },
): Promise<PlanVisual[]> {
  const supabase = await createClient();
  const [covers, artists, files] = await Promise.all([
    input.masterId
      ? listMasterCovers(input.masterId)
      : Promise.resolve(new Map()),
    input.artistIds.length
      ? supabase
          .from("artists")
          .select("id, name, picture_path, picture_url")
          .in("id", [...new Set(input.artistIds)])
      : null,
    supabase
      .from("project_files")
      .select("id, path, file_name")
      .eq("project_id", projectId)
      .like("mime", "image/%")
      .order("created_at", { ascending: false })
      .limit(40),
  ]);
  const out: PlanVisual[] = [];
  const cover = input.masterId ? covers.get(input.masterId) : undefined;
  if (cover) {
    const visual: Visual = {
      source: "master_file",
      id: cover.fileId,
      name: cover.fileName,
    };
    out.push({
      key: visualKey(visual),
      visual,
      name: cover.fileName,
      previewUrl: cover.thumbUrl,
      group: "cover",
    });
  }
  const artistRows = artists?.data ?? [];
  const pictures = await signArtistPictures(
    artistRows.flatMap((a) => (a.picture_path ? [a.picture_path] : [])),
  );
  for (const id of [...new Set(input.artistIds)]) {
    const a = artistRows.find((row) => row.id === id);
    const url = a?.picture_path
      ? pictures.get(a.picture_path)
      : (a?.picture_url ?? undefined);
    if (!a || !url) continue;
    const visual: Visual = { source: "artist_picture", id: a.id, name: a.name };
    out.push({
      key: visualKey(visual),
      visual,
      name: a.name,
      previewUrl: url,
      group: "artist",
    });
  }
  const rows = files.data ?? [];
  if (rows.length) {
    const { data } = await supabase.storage
      .from(FILE_BUCKETS.project)
      .createSignedUrls(
        rows.map((r) => r.path),
        SIGNED_URL_SECONDS,
      );
    rows.forEach((r, i) => {
      const url = data?.[i]?.signedUrl;
      if (!url) return;
      const visual: Visual = {
        source: "project_file",
        id: r.id,
        name: r.file_name,
      };
      out.push({
        key: visualKey(visual),
        visual,
        name: r.file_name,
        previewUrl: url,
        group: "project",
      });
    });
  }
  for (const visual of input.config.visuals ?? []) {
    if (visual.source !== "upload") continue;
    out.push({
      key: visualKey(visual),
      visual,
      name: visual.name,
      previewUrl: supabase.storage
        .from(VISUALS_BUCKET)
        .getPublicUrl(visual.path).data.publicUrl,
      group: "uploads",
    });
  }
  return out;
}
