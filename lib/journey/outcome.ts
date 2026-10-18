import "server-only";

import { isLocked, OPEN_STATUSES } from "@/lib/ui/journey";
import type {
  ResultNext,
  ResultUnlocked,
  WriteDone,
  WriteResult,
} from "@/lib/utils/write-result";

import { readProjectJourneys } from "./project";
import type { JourneyModuleKey, ProjectJourneys } from "./types";

// Four lines at most (proto « Projet complet »).
const MAX = 4;

const id = (place: string, key: string, href: string) =>
  `${place}|${key}|${href}`;

/**
 * What a gesture changed (VISION-UX rule 7): who acts now that did not
 * before (`next`) and the steps that left their lock (`unlocked`), by
 * comparing the journeys read before and after the write. Code only.
 */
export function outcomeOf(
  before: ProjectJourneys,
  after: ProjectJourneys,
): Pick<WriteDone, "next" | "unlocked"> {
  const acting = new Set(
    [...before.mine, ...before.waiting].map(
      (a) =>
        `${id(a.place, a.step.key, a.step.href)}|${a.step.actor?.name}|${a.step.actor?.todo}`,
    ),
  );
  const next: ResultNext[] = [...after.mine, ...after.waiting]
    .filter(
      (a) =>
        !acting.has(
          `${id(a.place, a.step.key, a.step.href)}|${a.step.actor?.name}|${a.step.actor?.todo}`,
        ),
    )
    .slice(0, MAX)
    .map((a) => ({
      who: a.step.actor?.name ?? "—",
      viaLink: a.step.actor?.viaLink ?? false,
      todo: a.step.actor?.todo ?? "",
      step: `${a.place} › ${a.step.title}`,
    }));
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
  return { next, unlocked };
}

/**
 * Runs a write of a Server Action and says what follows: the journeys of
 * `modules` read before and after, `done` the gesture in the past
 * participle, used by ResultBanner and the toast.
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
): Promise<WriteResult> {
  const before = await readProjectJourneys(projectId, modules);
  const result = await write();
  if (!result.ok) return result;
  const after = await readProjectJourneys(projectId, modules);
  return { ...result, done, ...outcomeOf(before, after) };
}
