// Builds a version of the Dossier de presse from what the project knows
// (lib/strategy/documents/press-kit-input.ts) and the generator's choices.
// Code only: nothing is invented, an empty page is left out, the input has
// no budget at all and assertNoBudget checks the result. Client-safe.

import { formatDay } from "@/lib/assistant/facts";
import { strategyPressKit } from "@/lib/i18n/fr/strategy-press-kit";
import { artistPresentation } from "@/lib/strategy/documents/artist-presentation";
import {
  proposeDirection,
  type Direction,
} from "@/lib/strategy/documents/direction";
import {
  orderedPressPages,
  type PressKitConfig,
  type PressKitContent,
  type PressKitPage,
} from "@/lib/strategy/documents/press-kit-model";
import {
  textsOf,
  type PressKitInput,
} from "@/lib/strategy/documents/press-kit-input";
import {
  assertNoBudget,
  type Block,
  type DocImage,
  type DocPage,
} from "@/lib/strategy/documents/release-plan-model";

const fr = { strategyPressKit };

const textBlock = (value: string | null | undefined): Block[] =>
  value && value.trim() ? [{ type: "text", text: value.trim() }] : [];

export function buildPressKit(
  input: PressKitInput & {
    images: DocImage[];
    generatedBy: string;
    generatedAt: string;
  },
  config: PressKitConfig,
): PressKitContent {
  const t = fr.strategyPressKit;
  const d = t.document;
  const names = t.pages.names;
  const page = (key: PressKitPage, blocks: Block[]): DocPage => ({
    key,
    title: names[key],
    blocks,
  });
  const texts = Object.fromEntries(
    textsOf(input, config).map((x) => [x.key, x.excluded ? "" : x.text]),
  ) as Record<string, string>;
  const release = input.project.releaseDate;
  const direction: Direction =
    config.direction ??
    proposeDirection({ palette: [], lightness: null, saturation: null }, 0);
  const images = input.images;
  const links = config.links ?? input.knownLinks;
  const contacts = config.contacts ?? input.defaultContacts;
  const artistFacts = input.artist
    ? artistPresentation(input.artist).facts
    : [];

  const pages: Partial<Record<PressKitPage, DocPage>> = {
    cover: {
      key: "cover",
      title: input.project.title,
      eyebrow: d.tagline,
      subtitle: [input.project.artist, release ? formatDay(release) : null]
        .filter(Boolean)
        .join(" · "),
      image: images[0] ?? null,
      blocks: [],
    },
    artist: page("artist", [
      ...textBlock(texts.artist),
      ...(texts.artist && artistFacts.length > 1
        ? [{ type: "facts" as const, items: artistFacts }]
        : []),
    ]),
    news: page("news", textBlock(texts.news)),
    story: page("story", textBlock(texts.story)),
    narrative: page("narrative", textBlock(texts.narrative)),
    visuals: images.length
      ? page("visuals", [{ type: "images", images: images.slice(0, 6) }])
      : undefined,
    release_info: page("release_info", [
      {
        type: "facts",
        items: [
          { label: d.project, value: input.project.title },
          { label: d.artist, value: input.project.artist || "—" },
          { label: d.format, value: input.project.type || "—" },
          {
            label: d.releaseDate,
            value: release ? formatDay(release) : d.noDate,
          },
          { label: d.label, value: d.labelName },
          ...(input.upc ? [{ label: d.upc, value: input.upc }] : []),
        ],
      },
      ...(input.tracks.length
        ? [
            {
              type: "list" as const,
              items: input.tracks.map((x) =>
                x.isrc ? `${x.title} — ISRC ${x.isrc}` : x.title,
              ),
            },
          ]
        : []),
    ]),
    listen: links.length
      ? page("listen", [{ type: "links", items: links }])
      : undefined,
    contacts: contacts.length
      ? page("contacts", [
          {
            type: "entries",
            items: contacts.map((c) => ({
              label: c.role || c.name,
              text: [c.role ? c.name : null, c.email || null, c.phone || null]
                .filter(Boolean)
                .join("\n"),
            })),
          },
        ])
      : undefined,
    press_info: page("press_info", textBlock(texts.press_info)),
  };

  const content: PressKitContent = {
    kind: "press_kit",
    project: input.project,
    direction,
    pages: orderedPressPages(config.pages).flatMap((choice) => {
      if (choice.hidden) return [];
      const base = pages[choice.key];
      const own = choice.text?.trim();
      if (!base && !own) return [];
      const result: DocPage = {
        ...(base ?? { key: choice.key, title: names[choice.key], blocks: [] }),
        ...(choice.title?.trim() ? { title: choice.title.trim() } : {}),
      };
      result.blocks = own
        ? [...textBlock(own), ...result.blocks]
        : result.blocks;
      return result.key === "cover" || result.blocks.length ? [result] : [];
    }),
    generatedBy: input.generatedBy,
    generatedAt: input.generatedAt,
  };
  assertNoBudget(content);
  return content;
}

/** The dossier's pages today's data and choices leave empty. */
export function emptyPressPages(
  input: PressKitInput,
  config: PressKitConfig,
  images: number,
): PressKitPage[] {
  const texts = textsOf(input, config);
  const blank = (key: string) =>
    texts.some((x) => x.key === key && (x.excluded || !x.text.trim()));
  const empty: PressKitPage[] = ["free"];
  for (const key of [
    "artist",
    "news",
    "story",
    "narrative",
    "press_info",
  ] as const)
    if (blank(key)) empty.push(key);
  if (!images) empty.push("visuals");
  if (!(config.links ?? input.knownLinks).length) empty.push("listen");
  if (!(config.contacts ?? input.defaultContacts).length)
    empty.push("contacts");
  return empty;
}
