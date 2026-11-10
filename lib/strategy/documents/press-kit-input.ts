// What the Dossier de presse starts from (ticket Stratégie § 12): the
// validated strategy, the artist sheet, the project and its release, as the
// code reads them — and the texts proposed from them. Nothing is invented:
// an unknown text stays empty and is shown as missing. Never the budget (not
// even read here). Client-safe.

import { formatDay } from "@/lib/assistant/facts";
import { strategyPressKit } from "@/lib/i18n/fr/strategy-press-kit";
import {
  artistPresentation,
  type ArtistSheet,
} from "@/lib/strategy/documents/artist-presentation";
import type {
  PressBlock,
  PressContact,
  PressKitConfig,
  PressLink,
} from "@/lib/strategy/documents/press-kit-model";
import type { KnownFact } from "@/lib/strategy/documents/plan-steps";
import type { StrategyData } from "@/lib/strategy/queries";

const fr = { strategyPressKit };

export type PressKitInput = {
  project: {
    title: string;
    artist: string;
    type: string;
    releaseDate: string | null;
  };
  artist: ArtistSheet | null;
  tracks: Array<{ title: string; isrc: string | null }>;
  upc: string | null;
  // The narrative's validated parts, by key (narrative_origin…, angle).
  narrative: Record<string, string>;
  // Links the project already knows (release, smartlink, artist on Deezer).
  knownLinks: PressLink[];
  // The project's owner, by default the press contact.
  defaultContacts: PressContact[];
};

/** The validated narrative's parts and angle, by key. */
export function narrativeOf(data: StrategyData): Record<string, string> {
  const parts: Record<string, string> = {};
  for (const p of data.narrativeParts)
    if (p.status === "confirmed" && p.value) parts[p.key] = p.value;
  const angle = data.fields.find(
    (f) => f.key === "narrative" && f.status === "confirmed",
  )?.value;
  if (angle) parts.angle = angle;
  return parts;
}

const joined = (values: Array<string | undefined>) =>
  values.filter((v): v is string => Boolean(v?.trim())).join("\n\n");

/** Each text of the dossier as proposed from known data ("" = missing). */
export function proposedTexts(
  input: PressKitInput,
): Record<PressBlock, string> {
  const t = fr.strategyPressKit.document;
  const n = input.narrative;
  const date = input.project.releaseDate
    ? formatDay(input.project.releaseDate)
    : null;
  return {
    artist: input.artist ? (artistPresentation(input.artist).text ?? "") : "",
    news: input.project.artist
      ? t.news(
          input.project.title,
          input.project.type,
          input.project.artist,
          date,
        )
      : "",
    story: joined([n.narrative_origin, n.narrative_story]),
    narrative: joined([n.angle, n.narrative_context, n.narrative_why_now]),
    press_info: "",
  };
}

/** The texts as the owner left them, else as proposed. */
export function textsOf(input: PressKitInput, config: PressKitConfig) {
  const proposed = proposedTexts(input);
  return (Object.keys(proposed) as PressBlock[]).map((key) => {
    const own = config.texts?.find((x) => x.key === key);
    return {
      key,
      text: own?.text ?? proposed[key],
      excluded: own?.excluded ?? false,
      proposed: proposed[key],
    };
  });
}

/** One line per thing already known (step 1), never asked again. */
export function pressKnownItems(input: PressKitInput): KnownFact[] {
  const t = fr.strategyPressKit.intro.items;
  const proposed = proposedTexts(input);
  const cut = (value: string) =>
    value.length > 160 ? `${value.slice(0, 157)}…` : value;
  return [
    {
      key: "artist",
      label: t.artist,
      value: proposed.artist ? cut(proposed.artist) : null,
    },
    { key: "release", label: t.release, value: proposed.news || null },
    {
      key: "story",
      label: t.story,
      value: proposed.story ? cut(proposed.story) : null,
    },
    {
      key: "narrative",
      label: t.narrative,
      value: proposed.narrative ? cut(proposed.narrative) : null,
    },
    {
      key: "tracks",
      label: t.tracks,
      value: null,
      items: input.tracks.map((x) => x.title),
      wide: true,
    },
  ];
}
