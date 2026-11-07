import "server-only";

import { NoObjectGeneratedError } from "ai";
import type { z } from "zod";

// How many passes may drop items: an item dropped may reveal another one
// (an array inside an array), never more.
const MAX_ROUNDS = 5;

/** The value at `path` inside `root`, or undefined. */
function at(root: unknown, path: readonly PropertyKey[]): unknown {
  let value = root;
  for (const key of path) {
    if (value === null || typeof value !== "object") return undefined;
    value = (value as Record<PropertyKey, unknown>)[key];
  }
  return value;
}

/**
 * The answer with every list item that does not match the schema left out
 * (ministral-14b, 07/11/2026: five Stratégie levers without their quote made
 * a whole call report fail). Only items of a list are dropped — an item
 * without its quote cannot be cited anyway (docs/ASSISTANT.md, provenance);
 * any other mismatch (a missing summary, a wrong field outside a list)
 * stays an error. Returns undefined when it cannot be repaired so.
 */
function withoutInvalidItems<T>(
  value: unknown,
  schema: z.ZodType<T>,
): { data: T; dropped: number } | undefined {
  const current: unknown = structuredClone(value);
  let dropped = 0;
  for (let round = 0; round <= MAX_ROUNDS; round++) {
    const result = schema.safeParse(current);
    if (result.success) return { data: result.data, dropped };
    if (round === MAX_ROUNDS) return;
    const cuts = new Map<string, { list: unknown[]; index: number }>();
    for (const issue of result.error.issues) {
      const last = issue.path.findLastIndex((key) => typeof key === "number");
      if (last === -1) return;
      const list = at(current, issue.path.slice(0, last));
      if (!Array.isArray(list)) return;
      const index = issue.path[last] as number;
      cuts.set(`${issue.path.slice(0, last).join(".")}#${index}`, {
        list,
        index,
      });
    }
    // From the end of each list, so the other indexes still hold.
    [...cuts.values()]
      .sort((a, b) => b.index - a.index)
      .forEach(({ list, index }) => list.splice(index, 1));
    dropped += cuts.size;
  }
}

/**
 * An answer that did not match the schema, made usable when it safely can
 * be: ministral-14b sometimes wraps a correct answer in the shape of the
 * schema itself, {"type":"object","properties":{…the answer…}} (feedback
 * triage, 27/09/2026), and sometimes leaves a required field out of a few
 * list items (call report, 07/11/2026). Anything else stays an error.
 */
export function repairedOutput<T>(
  error: unknown,
  schema: z.ZodType<T>,
): T | undefined {
  if (!NoObjectGeneratedError.isInstance(error) || !error.text) return;
  let parsed: unknown;
  try {
    parsed = JSON.parse(error.text);
  } catch {
    return;
  }
  const echoed =
    parsed && typeof parsed === "object" && "properties" in parsed
      ? parsed.properties
      : undefined;
  for (const candidate of echoed === undefined ? [parsed] : [echoed, parsed]) {
    const repaired = withoutInvalidItems(candidate, schema);
    if (!repaired) continue;
    if (repaired.dropped > 0)
      console.warn(
        `[ai] ${repaired.dropped} list item(s) not matching the schema left out`,
      );
    return repaired.data;
  }
}
