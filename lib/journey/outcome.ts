import "server-only";

import { withQueryBatching } from "@/lib/supabase/batch";
import { actionHref, isLocked, OPEN_STATUSES } from "@/lib/ui/journey";
import type {
  ResultNext,
  ResultOpen,
  ResultUnlocked,
  WriteDone,
  WriteResult,
} from "@/lib/utils/write-result";

import { projectVersion } from "@/lib/projects/version-cache";

import { loadProjectJourneys, readProjectJourneys } from "./project";
import type { JourneyModuleKey, ProjectAction, ProjectJourneys } from "./types";

// Four lines at most (proto « Projet complet »).
const MAX = 4;

const id = (place: string, key: string, href: string) =>
  `${place}|${key}|${href}`;

const actingId = (a: ProjectAction) =>
  `${id(a.place, a.step.key, a.step.href)}|${a.step.actor?.name}|${a.step.actor?.todo}`;

/**
 * What a gesture changed (VISION-UX rule 7): who acts now that did not
 * before (`next`, the viewer's own first), the steps that left their lock
 * (`unlocked`) and the viewer's first new action (`open`: the client opens
 * it when it is on another page — « ouvrir tout seul la prochaine étape si
 * elle est à la même personne », lot 3 of Ibé's feedback), by comparing
 * the journeys read before and after the write. Code only.
 */
export function outcomeOf(
  before: ProjectJourneys,
  after: ProjectJourneys,
): Pick<WriteDone, "next" | "unlocked" | "open"> {
  const acting = new Set([...before.mine, ...before.waiting].map(actingId));
  const fresh = [...after.mine, ...after.waiting].filter(
    (a) => !acting.has(actingId(a)),
  );
  const next: ResultNext[] = fresh.slice(0, MAX).map((a) => ({
    who: a.step.actor?.name ?? "—",
    viewer: a.step.actor?.viewer ?? false,
    viaLink: a.step.actor?.viaLink ?? false,
    todo: a.step.actor?.todo ?? "",
    step: `${a.place} › ${a.step.title}`,
  }));
  const mine = fresh.find((a) => a.step.actor?.viewer);
  const open: ResultOpen | undefined = mine && {
    href: actionHref(mine.step),
    step: `${mine.place} › ${mine.step.title}`,
  };
  const wasLocked = new Set(
    before.journeys.flatMap((j) =>
      j.steps
        .filter((s) => isLocked(s.status))
        .map((s) => id(j.label + (j.part?.key ?? ""), s.key, s.href)),
    ),
  );
  const unlocked: ResultUnlocked[] = after.journeys
    .flatMap((j) =>
      j.steps
        .filter(
          (s) =>
            OPEN_STATUSES.includes(s.status) &&
            wasLocked.has(id(j.label + (j.part?.key ?? ""), s.key, s.href)),
        )
        .map((s) => ({
          step: s.title,
          who: s.actor?.name ?? null,
          todo: s.actor?.todo ?? null,
        })),
    )
    .slice(0, MAX);
  return { next, unlocked, ...(open && { open }) };
}

// The journeys of `modules` alone, as the comparison has always read them.
function only(
  all: ProjectJourneys,
  modules: readonly JourneyModuleKey[],
): ProjectJourneys {
  const kept = (a: { module: JourneyModuleKey }) => modules.includes(a.module);
  return {
    journeys: all.journeys.filter(kept),
    mine: all.mine.filter(kept),
    waiting: all.waiting.filter(kept),
    validations: all.validations.filter(kept),
  };
}

/**
 * Runs a write of a Server Action and says what follows: the journeys of
 * `modules` read before and after, `done` the gesture in the past
 * participle, used by ResultBanner and the toast. `openNext`: the
 * viewer's next step, when it is on another page, opens by itself (the
 * Cadrage, its plan and the Master's Brief, lot 3 of Ibé's feedback);
 * elsewhere the banner only says it.
 *
 *   return withOutcome(projectId, ["legal"], t.done.confirmed, async () => {
 *     const { error } = await supabase.rpc(…);
 *     return error ? { ok: false, error: t.failed } : { ok: true };
 *   });
 */
export async function withOutcome(
  projectId: string,
  modules: readonly JourneyModuleKey[],
  done: string,
  write: () => Promise<WriteResult>,
  { openNext = false }: { openNext?: boolean } = {},
): Promise<WriteResult> {
  // Both readings go through the journeys kept per project version
  // (loadProjectJourneys): « before » is the version the page on screen was
  // just rendered at, so it is kept already; « after » is the new version,
  // read once here and reused as is by the page Next renders again in this
  // action's response (its header, « Maintenant », the navigation's
  // counts). Read here for `modules` only, then by the page in full, it
  // cost three readings of the project per gesture: 10 s to retain a lever
  // (Sacha, 28/10/2026). Each in its own batching scope (lib/supabase/
  // batch.ts): React's `cache` does nothing in a Server Action, and « after »
  // never reuses an answer read before the write. A write that did not move
  // the version (a table outside the project, a name in the Réseau) is read
  // again directly, as before.
  const [version, before] = await Promise.all([
    projectVersion(projectId),
    withQueryBatching(() => loadProjectJourneys(projectId)),
  ]);
  const result = await write();
  if (!result.ok) return result;
  const moved = (await projectVersion(projectId)) !== version;
  const after = await withQueryBatching(() =>
    moved
      ? loadProjectJourneys(projectId)
      : readProjectJourneys(projectId, modules),
  );
  const { open, ...outcome } = outcomeOf(
    only(before, modules),
    only(after, modules),
  );
  return { ...result, done, ...outcome, ...(openNext && open && { open }) };
}
