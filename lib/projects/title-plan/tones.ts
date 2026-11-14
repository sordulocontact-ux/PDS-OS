// The tones of a title plan's statuses (lot 14, docs/DESIGN.md § 3): nothing
// shared yet is neutral, an internal version runs, a plan to share waits for
// the owner's gesture, an active plan is live, an archived one set aside.
// Client-safe.

import type { Tone } from "@/lib/ui/state-tones";
import type { TitlePlanStatus } from "@/lib/projects/title-plan/model";

export const planStatusTone: Record<TitlePlanStatus, Tone> = {
  draft: "neutral",
  provisional: "neutral",
  internal: "info",
  ready_to_share: "action",
  revised: "info",
  active: "success",
  archived: "neutral",
};
