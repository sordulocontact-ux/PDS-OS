// Builds a version's document of a title's Plan de sortie (lot 14) from the
// draft and what the project says: the title, its confirmed artists, its
// release date, its marketing actions (the title's own and the project's,
// lot 10). Code only: nothing invented, nothing internal (priority, people
// in charge, validations, working links) and never a budget (assertNoBudget
// checks the result). Client-safe.

import { titleReleasePlans } from "@/lib/i18n/fr/title-release-plans";
import {
  actionFingerprint,
  type PlanSource,
  type TitlePlanConfig,
  type TitlePlanContent,
} from "@/lib/projects/title-plan/model";
import {
  assertNoBudget,
  type DocImage,
} from "@/lib/strategy/documents/release-plan-model";

const fr = { titleReleasePlans };

/** A marketing action of the title's plan (a deliverable or an activation). */
export type PlanAction = {
  key: string;
  kind: "deliverable" | "activation";
  title: string;
  date: string | null;
  ownerId: string | null;
  // Targeted on this title (lot 10), else a global action of the project.
  dedicated: boolean;
};

export type TitlePlanInput = {
  title: string;
  artist: string;
  guests: string[];
  single: boolean;
  releaseDate: string | null;
  // The cover when the owner chose none: the title's artwork, else the
  // main artist's picture (its visual key).
  defaultCover: string | null;
  actions: PlanAction[];
  // Every visual of the draft as the document shows it, by its key.
  images: Map<string, DocImage>;
  // What the Stratégie validated, when the draft says nothing.
  strategy: {
    objective: string | null;
    audience: string | null;
    message: string | null;
  };
  generatedBy: string;
  generatedAt: string;
};

const clean = (value: string | null | undefined) =>
  value && value.trim() ? value.trim() : null;

/** The visual keys a version needs published (cover, release page, content
 * pages, timeline). */
export function visualsUsed(
  input: Pick<TitlePlanInput, "actions" | "defaultCover">,
  config: TitlePlanConfig,
): string[] {
  const keys = new Set<string>();
  const cover = config.cover ?? input.defaultCover;
  if (cover) keys.add(cover);
  for (const placement of config.placements ?? [])
    if (placement.visual) keys.add(placement.visual);
  if (config.listeningVisual && clean(config.listeningUrl))
    keys.add(config.listeningVisual);
  for (const action of input.actions) {
    const choice = config.actions?.[action.key];
    if (choice?.include === false) continue;
    for (const key of choice?.visuals ?? []) keys.add(key);
    const date = config.actionDates?.[action.key];
    if (action.date && date?.visual) keys.add(date.visual);
  }
  for (const entry of config.timeline ?? [])
    if (entry.visual) keys.add(entry.visual);
  return [...keys];
}

/** The actions as a version reads them, to tell later what changed. */
export const sourcesFor = (actions: PlanAction[]): PlanSource[] =>
  actions.map((a) => ({
    key: a.key,
    label: a.title,
    fp: actionFingerprint(a),
  }));

export function buildTitlePlan(
  input: TitlePlanInput,
  config: TitlePlanConfig,
): TitlePlanContent {
  const image = (key: string | null | undefined) =>
    key ? (input.images.get(key) ?? null) : null;
  const included = input.actions.filter(
    (a) => config.actions?.[a.key]?.include !== false,
  );
  const release = input.releaseDate;

  const timeline: TitlePlanContent["timeline"] = [
    ...included.flatMap((a) => {
      if (!a.date) return [];
      const date = config.actionDates?.[a.key];
      return [
        {
          date: a.date,
          label: a.title,
          account: date?.account ?? "",
          image: image(date?.visual),
          releaseDay: a.date === release,
        },
      ];
    }),
    ...(config.timeline ?? []).map((e) => ({
      date: e.date,
      label: e.format,
      account: e.account,
      image: image(e.visual),
      releaseDay: e.date === release,
    })),
  ];
  // The release itself, unless a content already marks that day.
  if (release && !timeline.some((e) => e.date === release))
    timeline.push({
      date: release,
      label: fr.titleReleasePlans.doc.release,
      account: "",
      image: null,
      releaseDay: true,
    });
  timeline.sort((a, b) => a.date.localeCompare(b.date));

  const content: TitlePlanContent = {
    kind: "title_release_plan",
    single: input.single,
    title: input.title,
    artist: input.artist,
    guests: input.guests,
    cover: image(config.cover ?? input.defaultCover),
    releaseDate: release,
    platforms: config.platforms ?? [],
    placements: (config.placements ?? []).map((p) => ({
      label: p.label,
      image: image(p.visual),
    })),
    listeningUrl: clean(config.listeningUrl),
    // A picture of the listening page says nothing without its link.
    listeningImage: clean(config.listeningUrl)
      ? image(config.listeningVisual)
      : null,
    objective: clean(config.objective) ?? input.strategy.objective,
    audience: clean(config.audience) ?? input.strategy.audience,
    message: clean(config.message) ?? input.strategy.message,
    phases: (config.phases ?? []).map((p) => ({
      name: p.name,
      text: p.text,
    })),
    contents: included.map((a) => {
      const choice = config.actions?.[a.key];
      return {
        title: a.title,
        text: choice?.text ?? "",
        images: (choice?.visuals ?? []).flatMap((key) => {
          const found = image(key);
          return found ? [found] : [];
        }),
      };
    }),
    timeline,
    generatedBy: input.generatedBy,
    generatedAt: input.generatedAt,
  };
  assertNoBudget(content);
  return content;
}
