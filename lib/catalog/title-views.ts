// Views of the Catalogue (retours Catalogue 01 et 02 du 11/10/2026,
// docs/ARCHITECTURE.md § 2 septies): four tabs by where the song stands,
// in the URL (?state=), and the audio steps as a filter (?audio=), with the
// artist and the project (?artist=, ?project=), all combinable with the
// search. « Finalisés » means a Master final was validated, never only
// deposited. Pure, client-safe.

import { AUDIO_STATES, isAudioState } from "@/lib/catalog/title-rules";
import type { AudioState } from "@/lib/catalog/title-rules";

export const TITLE_VIEWS = [
  "all",
  "creation",
  "production",
  "finalised",
] as const;
export type TitleView = (typeof TITLE_VIEWS)[number];

export const DEFAULT_TITLE_VIEW: TitleView = "all";

export function titleViewOf(param: unknown): TitleView {
  return typeof param === "string" &&
    (TITLE_VIEWS as readonly string[]).includes(param)
    ? (param as TitleView)
    : DEFAULT_TITLE_VIEW;
}

/** The value in the URL: none for the default view. */
export const titleViewParam = (view: TitleView): string | null =>
  view === DEFAULT_TITLE_VIEW ? null : view;

type Viewed = {
  audioState: AudioState | null;
  finalValidatedAt: string | null;
};

// En création: no audio yet, or a demo. En production: from the rough mix
// to a Master final not yet validated. Finalisés: validated.
export function inTitleView(title: Viewed, view: TitleView): boolean {
  const finalised = title.finalValidatedAt !== null;
  switch (view) {
    case "all":
      return true;
    case "finalised":
      return finalised;
    case "creation":
      return (
        !finalised && (title.audioState === null || title.audioState === "demo")
      );
    case "production":
      return (
        !finalised && title.audioState !== null && title.audioState !== "demo"
      );
  }
}

export function countTitleViews(
  titles: ReadonlyArray<Viewed>,
): Record<TitleView, number> {
  return Object.fromEntries(
    TITLE_VIEWS.map((view) => [
      view,
      titles.filter((title) => inTitleView(title, view)).length,
    ]),
  ) as Record<TitleView, number>;
}

// The audio step filter: « Non renseigné » (none) or a step.
export const AUDIO_FILTERS = ["none", ...AUDIO_STATES] as const;
export type AudioFilter = (typeof AUDIO_FILTERS)[number];

export function audioFilterOf(param: unknown): AudioFilter | null {
  return param === "none" || isAudioState(param) ? param : null;
}

export type TitleFilters = {
  audio: AudioFilter | null;
  artist: string | null;
  project: string | null;
};

type Filtered = {
  audioState: AudioState | null;
  credited: Array<{ id: string }>;
  projects: Array<{ id: string }>;
};

export function matchesTitleFilters(
  title: Filtered,
  filters: TitleFilters,
): boolean {
  if (filters.audio !== null) {
    const state = title.audioState ?? "none";
    if (state !== filters.audio) return false;
  }
  if (
    filters.artist !== null &&
    !title.credited.some((a) => a.id === filters.artist)
  )
    return false;
  if (
    filters.project !== null &&
    !title.projects.some((p) => p.id === filters.project)
  )
    return false;
  return true;
}
