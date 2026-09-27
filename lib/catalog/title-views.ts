// Views of the Titres list by audio state (docs/ARCHITECTURE.md § 2 septies),
// in the URL (?state=). The default view leaves the demos out: a demo stays
// a title, one tab away, without crowding the songs that moved on. A title
// whose state is unknown is never hidden. Pure, client-safe.

import { AUDIO_STATES, isAudioState } from "@/lib/catalog/title-rules";
import type { AudioState } from "@/lib/catalog/title-rules";

export const TITLE_VIEWS = ["withoutDemos", ...AUDIO_STATES, "all"] as const;
export type TitleView = (typeof TITLE_VIEWS)[number];

export const DEFAULT_TITLE_VIEW: TitleView = "withoutDemos";

export function titleViewOf(param: unknown): TitleView {
  return param === "all" || isAudioState(param) ? param : DEFAULT_TITLE_VIEW;
}

/** The value in the URL: none for the default view. */
export const titleViewParam = (view: TitleView): string | null =>
  view === DEFAULT_TITLE_VIEW ? null : view;

export function inTitleView(
  title: { audioState: AudioState | null },
  view: TitleView,
): boolean {
  if (view === "all") return true;
  if (view === "withoutDemos") return title.audioState !== "demo";
  return title.audioState === view;
}

export function countTitleViews(
  titles: ReadonlyArray<{ audioState: AudioState | null }>,
): Record<TitleView, number> {
  return Object.fromEntries(
    TITLE_VIEWS.map((view) => [
      view,
      titles.filter((title) => inTitleView(title, view)).length,
    ]),
  ) as Record<TitleView, number>;
}
