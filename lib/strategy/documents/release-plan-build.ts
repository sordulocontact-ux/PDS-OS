// Builds a version of the Plan de sortie from the validated strategy, the
// project and the generator's choices. Code only: nothing is invented, an
// empty page is left out, and the input has no budget at all (the Plan de
// sortie never carries one; assertNoBudget checks the result). Client-safe.

import { formatDay } from "@/lib/assistant/facts";
import { fr } from "@/lib/i18n/fr";
import { dayOffset } from "@/lib/strategy/calendar";
import {
  proposeDirection,
  type Direction,
} from "@/lib/strategy/documents/direction";
import { inPhase, phaseRange } from "@/lib/strategy/documents/phases";
import {
  assertNoBudget,
  orderedPages,
  type Block,
  type DocImage,
  type DocPage,
  type Format,
  type ReleasePlanConfig,
  type ReleasePlanContent,
  type ReleasePlanPage,
} from "@/lib/strategy/documents/release-plan-model";

export type ReleasePlanInput = {
  project: ReleasePlanContent["project"];
  positioning: string | null;
  audiences: string | null;
  objective: string | null;
  // The narrative's parts then its angle, each with its label.
  narrative: Array<{ label: string; text: string }>;
  // Selected levers, by family label.
  levers: Array<{ label: string; family: string }>;
  milestones: Array<{ occurs_on: string; title: string; channel: string }>;
  // The validated deliverables, when the owner did not choose formats yet.
  formats: Format[];
  images: DocImage[];
  generatedBy: string;
  generatedAt: string;
};

const text = (value: string | null | undefined): Block[] =>
  value && value.trim() ? [{ type: "text", text: value.trim() }] : [];

/** Applies the owner's page choices: order, hidden, own title, own text. */
function finish(
  choices: ReleasePlanConfig["pages"],
  pages: Partial<Record<ReleasePlanPage, DocPage>>,
): DocPage[] {
  const names = fr.strategyReleasePlan.pages.names;
  return orderedPages(choices).flatMap((choice) => {
    if (choice.hidden) return [];
    const page = pages[choice.key];
    const own = choice.text?.trim();
    if (!page && !own) return [];
    const base: DocPage = page ?? {
      key: choice.key,
      title: names[choice.key],
      blocks: [],
    };
    const result: DocPage = {
      ...base,
      title: choice.title?.trim() || base.title,
      blocks: own ? [...text(own), ...base.blocks] : base.blocks,
    };
    return result.key === "cover" || result.blocks.length ? [result] : [];
  });
}

export function buildReleasePlan(
  input: ReleasePlanInput,
  config: ReleasePlanConfig,
): ReleasePlanContent {
  const t = fr.strategyReleasePlan;
  const names = t.pages.names;
  const page = (key: ReleasePlanPage, blocks: Block[]): DocPage => ({
    key,
    title: names[key],
    blocks,
  });
  const release = input.project.releaseDate;
  const day = fr.strategy.calendar.dayOffset;
  const channels = fr.strategyCalendar.channels as Record<string, string>;
  const dated = input.milestones
    .map((m) => ({
      ...m,
      offset: release ? dayOffset(m.occurs_on, release) : null,
    }))
    .sort((a, b) => a.occurs_on.localeCompare(b.occurs_on));
  const formats = (config.formats ?? input.formats).filter((f) => f.include);
  const direction: Direction =
    config.direction ??
    proposeDirection({ palette: [], lightness: null, saturation: null }, 0);
  const images = input.images;
  const families = [...new Set(input.levers.map((l) => l.family))];

  const positioning = [
    { label: t.content.audiences, text: input.audiences },
    { label: t.content.objective, text: input.objective },
  ].flatMap((e) => (e.text ? [{ label: e.label, text: e.text }] : []));

  const pages: Partial<Record<ReleasePlanPage, DocPage>> = {
    cover: {
      key: "cover",
      title: input.project.title,
      eyebrow: t.content.kind,
      subtitle: [input.project.artist, release ? formatDay(release) : null]
        .filter(Boolean)
        .join(" · "),
      image: images[0] ?? null,
      blocks: [],
    },
    release_info: page("release_info", [
      {
        type: "facts",
        items: [
          { label: t.content.project, value: input.project.title },
          { label: t.content.artist, value: input.project.artist || "—" },
          { label: t.content.format, value: input.project.type || "—" },
          {
            label: t.content.releaseDate,
            value: release ? formatDay(release) : t.content.noDate,
          },
          { label: t.content.label, value: t.content.labelName },
        ],
      },
    ]),
    positioning: page("positioning", [
      ...text(input.positioning),
      ...(positioning.length
        ? [{ type: "entries" as const, items: positioning }]
        : []),
    ]),
    narrative: input.narrative.length
      ? page("narrative", [{ type: "entries", items: input.narrative }])
      : undefined,
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
    setup: families.length
      ? page("setup", [
          {
            type: "groups",
            items: families.map((family) => ({
              label: family,
              lines: input.levers
                .filter((l) => l.family === family)
                .map((l) => l.label),
            })),
          },
        ])
      : undefined,
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
      images.length || direction.palette.length
        ? page("moodboard", [
            ...(images.length
              ? [{ type: "images" as const, images: images.slice(0, 6) }]
              : []),
            ...(direction.palette.length
              ? [{ type: "palette" as const, colors: direction.palette }]
              : []),
          ])
        : undefined,
    timeline: dated.length
      ? page("timeline", [
          {
            type: "timeline",
            items: dated.map((m) => ({
              when: [
                m.offset !== null ? day(m.offset) : null,
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

  const content: ReleasePlanContent = {
    kind: "release_plan",
    project: input.project,
    direction,
    pages: finish(config.pages, pages),
    generatedBy: input.generatedBy,
    generatedAt: input.generatedAt,
  };
  assertNoBudget(content);
  return content;
}
