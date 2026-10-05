import "server-only";

import { ARTIST_RELATIONS } from "@/lib/catalog/types";
import { AUDIO_STATES } from "@/lib/catalog/title-rules";
import { PRIORITIES, type MusicFormat } from "@/lib/projects/types";

/**
 * Fake values for test records, drawn by code (never by the model): names,
 * dates, amounts and states stay out of the LLM (CLAUDE.md, rule 6).
 * Fictional data, not interface text.
 */

const STAGE_FIRST = [
  "Nova",
  "Kairo",
  "Sélène",
  "Mako",
  "Ysé",
  "Rivo",
  "Zéphyr",
  "Ama",
  "Orso",
  "Lila",
  "Tiago",
  "Nahel",
];
const STAGE_LAST = [
  "Vega",
  "Dune",
  "Riva",
  "Nuit",
  "Solo",
  "Blanc",
  "Lune",
  "Kosmo",
  "Prism",
  "Rouge",
];
const TITLES = [
  "Minuit",
  "Asphalte",
  "Néons",
  "Lettre ouverte",
  "Rivière",
  "Sans filtre",
  "Ciel bas",
  "Dernier métro",
  "Fièvre",
  "Paname",
  "Plein phare",
  "Écume",
  "Vertige",
  "Mirage",
];
const RECORD_TITLES = [
  "Saison froide",
  "Zone grise",
  "Hors-champ",
  "Lumière noire",
  "Rive gauche",
  "Pression",
];
const CONTENT_TITLES = [
  "Session acoustique",
  "Making-of en studio",
  "Live au studio",
  "Interview vidéo",
  "Carnet de tournée",
];

// Masters created for a music project: a single links exactly one.
const MASTERS_PER_FORMAT: Record<MusicFormat, number> = {
  single: 1,
  ep: 3,
  album: 5,
  mixtape: 4,
  compilation: 4,
  other: 2,
};

const pick = <T>(list: readonly T[]): T =>
  list[Math.floor(Math.random() * list.length)];
const between = (min: number, max: number) =>
  min + Math.floor(Math.random() * (max - min + 1));

export function fakeArtist() {
  return {
    name: `${pick(STAGE_FIRST)} ${pick(STAGE_LAST)}`,
    relation: pick(ARTIST_RELATIONS),
  };
}

/** Distinct titles for one record, so a project never lists the same name twice. */
export function fakeMasters(count: number) {
  const titles = [...TITLES].sort(() => Math.random() - 0.5).slice(0, count);
  return titles.map((title) => ({
    title,
    audioState: pick(AUDIO_STATES),
    durationSeconds: between(140, 260),
  }));
}

export const mastersFor = (format: MusicFormat) => MASTERS_PER_FORMAT[format];

export function fakeProject(type: "music_release" | "content") {
  const due = new Date();
  due.setUTCDate(due.getUTCDate() + between(30, 150));
  return {
    title: pick(type === "content" ? CONTENT_TITLES : RECORD_TITLES),
    dueDate: due.toISOString().slice(0, 10),
    budgetCents: between(2, 40) * 500 * 100,
    priority: pick(PRIORITIES),
  };
}

/** A unique-name retry: « Nova Vega », then « Nova Vega 2 »… */
export const withSuffix = (name: string, attempt: number) =>
  attempt === 0 ? name : `${name} ${attempt + 1}`;
