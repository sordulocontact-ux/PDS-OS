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

import { readProjectJourneys } from "./project";
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
  // Each reading in its own batching scope (lib/supabase/batch.ts): React's
  // `cache` does nothing in a Server Action, so the loaders' common reads
  // (the project, the access, the people) left once per loader — 829
  // requests, 271 distinct, to launch a plan (page loads audit, 27/10). Two
  // scopes, so « after » never reuses an answer read before the write.
  const read = () =>
    withQueryBatching(() => readProjectJourneys(projectId, modules));
  const before = await read();
  const result = await write();
  if (!result.ok) return result;
  const after = await read();
  const { open, ...outcome } = outcomeOf(before, after);
  return { ...result, done, ...outcome, ...(openNext && open && { open }) };
}
