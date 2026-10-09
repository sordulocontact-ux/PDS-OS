// Builds a version of the Plan de sortie or the Dossier de presse from the
// validated Brief de sortie, the project and the generator's choices. Code
// only: nothing is invented, an empty page is left out, and the budget
// section of the Brief is never read here (ticket: the budget exists in the
// Brief only). Client-safe.

import { formatDay } from "@/lib/assistant/facts";
import { fr } from "@/lib/i18n/fr";
import type {
  SnapshotItem,
  StrategySnapshot,
} from "@/lib/strategy/brief-snapshot";
import { dayOffset } from "@/lib/strategy/calendar";
import type { StrategyDimension } from "@/lib/strategy/dimensions";
import {
  DEFAULT_ACCENT,
  orderedPages,
  PRESS_KIT_PAGES,
  RELEASE_PLAN_PAGES,
  type Block,
  type DocImage,
  type DocPage,
  type ExternalDoc,
  type PageKey,
  type PressKitConfig,
  type ReleasePlanConfig,
} from "@/lib/strategy/documents/model";
import { inPhase, phaseRange } from "@/lib/strategy/documents/phases";

// The dimensions an external document may read: never "budget".
type PublicDimension = Exclude<StrategyDimension, "budget">;

const itemsOf = (s: StrategySnapshot, d: PublicDimension): SnapshotItem[] =>
  s.sections.find((x) => x.dimension === d)?.items ?? [];
const valueOf = (s: StrategySnapshot, d: PublicDimension) =>
  itemsOf(s, d)[0]?.value ?? null;

export type BuildInput = {
  brief: StrategySnapshot;
  // Live milestones, for the phases and the timeline (frozen with the Brief).
  milestones: Array<{ occurs_on: string; title: string; channel: string }>;
  images: DocImage[];
  generatedBy: string;
};

const text = (value: string | null | undefined): Block[] =>
  value && value.trim() ? [{ type: "text", text: value.trim() }] : [];

function releaseFacts(s: StrategySnapshot): Block {
  const c = fr.strategyDocs.content;
  const p = s.project;
  return {
    type: "facts",
    items: [
      { label: c.project, value: p.title },
      { label: c.artist, value: p.artist || "—" },
      { label: c.format, value: p.type || "—" },
      {
        label: c.releaseDate,
        value: p.releaseDate ? formatDay(p.releaseDate) : c.noDate,
      },
      { label: c.label, value: c.labelName },
    ],
  };
}

function narrativeEntries(s: StrategySnapshot): Block[] {
  const items = itemsOf(s, "narrative").flatMap((i) =>
    i.value ? [{ label: i.label, text: i.value }] : [],
  );
  return items.length ? [{ type: "entries", items }] : [];
}

/** Applies the owner's page choices: order, hidden, own title, own text. */
function finish<K extends PageKey>(
  all: readonly K[],
  choices:
    | Array<{ key: K; hidden: boolean; title?: string; text?: string }>
    | undefined,
  pages: Partial<Record<K, DocPage>>,
): DocPage[] {
  return orderedPages(all, choices).flatMap((choice) => {
    if (choice.hidden) return [];
    const page = pages[choice.key];
    const own = choice.text?.trim();
    if (!page && !own) return [];
    const base: DocPage = page ?? {
      key: choice.key,
      title: fr.strategyDocs.pages[choice.key],
      blocks: [],
    };
    const result = {
      ...base,
      title: choice.title?.trim() || base.title,
      blocks: own ? [...text(own), ...base.blocks] : base.blocks,
    };
    return result.key === "cover" || result.blocks.length ? [result] : [];
  });
}

export function buildReleasePlan(
  input: BuildInput,
  config: ReleasePlanConfig,
): ExternalDoc {
  const { brief: s, milestones, images } = input;
  const t = fr.strategyDocs;
  const page = (key: PageKey, blocks: Block[]): DocPage => ({
    key,
    title: t.pages[key],
    blocks,
  });
  const release = s.project.releaseDate;
  const dated = milestones
    .map((m) => ({
      ...m,
      offset: release ? dayOffset(m.occurs_on, release) : null,
    }))
    .sort((a, b) => a.occurs_on.localeCompare(b.occurs_on));
  const channels = fr.strategyFlow.calendar.channels as Record<string, string>;
  const selectedLabel = fr.strategy.levers.states.selected;
  const formats = (config.formats ?? []).filter((f) => f.include);

  const pages: Partial<Record<(typeof RELEASE_PLAN_PAGES)[number], DocPage>> = {
    cover: {
      key: "cover",
      title: s.project.title,
      eyebrow: t.kinds.release_plan,
      subtitle: [s.project.artist, release ? formatDay(release) : null]
        .filter(Boolean)
        .join(" · "),
      image: images[0] ?? null,
      blocks: [],
    },
    release_info: page("release_info", [releaseFacts(s)]),
    positioning: (() => {
      const entries = [
        { label: t.content.audiences, text: valueOf(s, "audiences") },
        { label: t.content.objective, text: valueOf(s, "objectives") },
      ].flatMap((e) => (e.text ? [{ label: e.label, text: e.text }] : []));
      return page("positioning", [
        ...text(valueOf(s, "positioning")),
        ...(entries.length
          ? [{ type: "entries" as const, items: entries }]
          : []),
      ]);
    })(),
    narrative: page("narrative", narrativeEntries(s)),
    phases: (config.phases ?? []).length
      ? page("phases", [
          {
            type: "phases",
            items: (config.phases ?? []).map((phase) => ({
              name: phase.name,
              range: phaseRange(phase),
              lines: dated
                .filter((m) => m.offset !== null && inPhase(phase, m.offset))
                .map((m) => m.title),
            })),
          },
        ])
      : undefined,
    setup: (() => {
      const lines =
        itemsOf(s, "setup").find((i) => i.label === selectedLabel)?.lines ?? [];
      return lines.length
        ? page("setup", [{ type: "list", items: lines }])
        : undefined;
    })(),
    contents: formats.length
      ? page("contents", [
          {
            type: "list",
            items: formats.map((f) =>
              f.note ? `${f.title} — ${f.note}` : f.title,
            ),
          },
        ])
      : undefined,
    moodboard:
      images.length || config.direction?.palette?.length
        ? page("moodboard", [
            ...(images.length
              ? [{ type: "images" as const, images: images.slice(0, 4) }]
              : []),
            ...(config.direction?.palette?.length
              ? [{ type: "palette" as const, colors: config.direction.palette }]
              : []),
          ])
        : undefined,
    timeline: dated.length
      ? page("timeline", [
          {
            type: "timeline",
            items: dated.map((m) => ({
              when: [
                m.offset !== null
                  ? fr.strategy.calendar.dayOffset(m.offset)
                  : null,
                formatDay(m.occurs_on),
              ]
                .filter(Boolean)
                .join(" · "),
              title: m.title,
              detail: channels[m.channel] ?? "",
            })),
          },
        ])
      : undefined,
  };

  return {
    kind: "release_plan",
    project: s.project,
    theme: config.direction?.theme ?? "paper",
    accent: config.direction?.accent ?? DEFAULT_ACCENT,
    pages: finish(RELEASE_PLAN_PAGES, config.pages, pages),
    generatedBy: input.generatedBy,
  };
}

/** What the Dossier de presse says when the owner did not rewrite it. */
export function pressDefaults(
  s: StrategySnapshot,
  sources: {
    bio: string | null;
    owner: { name: string | null; email: string | null };
  },
) {
  const p = s.project;
  const c = fr.strategyDocs.content;
  const story = itemsOf(s, "narrative")
    .flatMap((i) => (i.value ? [i.value] : []))
    .join("\n\n");
  return {
    artistText: sources.bio ?? "",
    newsText: fr.strategyDocs.press.news(
      p.title,
      p.artist,
      p.type,
      p.releaseDate ? formatDay(p.releaseDate) : null,
    ),
    storyText: story,
    contactsText: sources.owner.name
      ? c.contactOf(sources.owner.name, sources.owner.email)
      : "",
    pressInfoText: "",
  };
}

export function buildPressKit(
  input: BuildInput & {
    links: Array<{ label: string; url: string }>;
    defaults: ReturnType<typeof pressDefaults>;
  },
  config: PressKitConfig,
): ExternalDoc {
  const { brief: s, images, defaults } = input;
  // Only web links reach the document (the renderer checks them again).
  const links = input.links.filter((l) => /^https?:\/\//i.test(l.url));
  const t = fr.strategyDocs;
  const page = (key: PageKey, blocks: Block[]): DocPage => ({
    key,
    title: t.pages[key],
    blocks,
  });
  const pick = (own: string | undefined, fallback: string) =>
    own !== undefined ? own : fallback;

  const pages: Partial<Record<(typeof PRESS_KIT_PAGES)[number], DocPage>> = {
    cover: {
      key: "cover",
      title: s.project.title,
      eyebrow: t.kinds.press_kit,
      subtitle: s.project.artist,
      image: images[0] ?? null,
      blocks: [],
    },
    artist: page("artist", text(pick(config.artistText, defaults.artistText))),
    news: page("news", text(pick(config.newsText, defaults.newsText))),
    story: page("story", text(pick(config.storyText, defaults.storyText))),
    universe: images.length
      ? page("universe", [{ type: "images", images: images.slice(0, 4) }])
      : undefined,
    release_info: page("release_info", [releaseFacts(s)]),
    listen: links.length
      ? page("listen", [{ type: "links", items: links }])
      : undefined,
    contacts: page(
      "contacts",
      text(pick(config.contactsText, defaults.contactsText)),
    ),
    press_info: page(
      "press_info",
      text(pick(config.pressInfoText, defaults.pressInfoText)),
    ),
  };

  return {
    kind: "press_kit",
    project: s.project,
    theme: config.direction?.theme ?? "paper",
    accent: config.direction?.accent ?? DEFAULT_ACCENT,
    pages: finish(PRESS_KIT_PAGES, config.pages, pages),
    generatedBy: input.generatedBy,
  };
}
