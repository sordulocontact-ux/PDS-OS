// Whether the validated Brief still says what the Cadrage says (PROJ-BUG-04):
// the plan rests on the validated version, so a change since then (a new
// party in the credits, a contract no longer signed…) is said on the plan,
// never applied to it silently. Client-safe.

import {
  briefChanges,
  buildBriefSnapshot,
  snapshotOf,
  type BriefChange,
} from "@/lib/framing/brief-snapshot";
import type { FramingKnowledge } from "@/lib/framing/knowledge";

export function briefDrift(k: FramingKnowledge): BriefChange[] {
  const approved = k.briefs
    .filter((b) => b.state === "approved")
    .sort((a, b) => b.version - a.version)[0];
  const stored = approved ? snapshotOf(approved.content) : null;
  // Versions written before 11/10/2026 are shaped differently (schema 1):
  // a comparison would report the code's change, not the project's.
  if (!stored || stored.schema !== 2) return [];
  return briefChanges(stored, buildBriefSnapshot(k));
}
