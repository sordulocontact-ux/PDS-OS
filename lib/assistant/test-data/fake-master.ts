import "server-only";

import type {
  ContributorRole,
  Organism,
  SessionKind,
  SplitRole,
} from "@/lib/catalog/master/rules";

/**
 * Fake contents of a title's page ("master" in the code), drawn by code:
 * sessions, tracks, credits, splits, rights, declarations, files
 * (docs/ASSISTANT.md § 3 ter). Fictional data, not interface text.
 */

const pick = <T>(list: readonly T[]): T =>
  list[Math.floor(Math.random() * list.length)];
const digits = (count: number) =>
  Array.from({ length: count }, () => Math.floor(Math.random() * 10)).join("");

/** A day `days` before today, as YYYY-MM-DD. */
export function daysAgo(days: number): string {
  const day = new Date();
  day.setUTCDate(day.getUTCDate() - days);
  return day.toISOString().slice(0, 10);
}

const STUDIOS = [
  "Studio Ferber",
  "Grande Armée",
  "Studio Pigalle",
  "Motorbass",
];
const ENGINEERS = [
  "Malik Benali",
  "Jeanne Roux",
  "Hugo Lemaire",
  "Inès Diallo",
];
const PEOPLE = [
  "Yanis Moreau",
  "Clara Nguyen",
  "Sami Haddad",
  "Léa Fontaine",
  "Noé Garnier",
  "Maya Petit",
];

export function fakeSessions(): {
  kind: SessionKind;
  session_date: string;
  studio: string;
  engineer: string;
  notes: string | null;
}[] {
  return [
    { kind: "recording", days: 60, notes: "Prises voix et guitares." },
    { kind: "mixing", days: 30, notes: null },
    { kind: "mastering", days: 15, notes: null },
  ].map(({ kind, days, notes }) => ({
    kind: kind as SessionKind,
    session_date: daysAgo(days),
    studio: pick(STUDIOS),
    engineer: pick(ENGINEERS),
    notes,
  }));
}

export const FAKE_TRACKS = [
  "Voix lead",
  "Chœurs",
  "Basse",
  "Batterie",
  "Synthé",
];

export function fakeContributors(): {
  name: string;
  role: ContributorRole;
  detail: string | null;
}[] {
  const roles: ContributorRole[] = [
    "composer",
    "lyricist",
    "producer",
    "mix_engineer",
    "mastering_engineer",
  ];
  const people = [...PEOPLE].sort(() => Math.random() - 0.5);
  return roles.map((role, i) => ({ name: people[i], role, detail: null }));
}

const CITIES = ["Paris", "Lyon", "Marseille", "Bruxelles", "Montréal"];

/** Contact details of an engineer added to the Réseau. */
export function fakeEngineerContact(name: string) {
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]+/g, ".");
  return {
    name,
    email: `${slug}@studio.test`,
    phone: `06 ${digits(2)} ${digits(2)} ${digits(2)} ${digits(2)}`,
    city: pick(CITIES),
  };
}

/** Two complete splits (100 % each): master and publishing. */
export function fakeSplits(artist: string, label: string) {
  const [author, composer] = [...PEOPLE].sort(() => Math.random() - 0.5);
  const split = (
    kind: "master" | "publishing",
    party: string,
    role: SplitRole,
    share: number,
  ) => ({ kind, party, role, share });
  return {
    master: [
      split("master", label, "label", 60),
      split("master", artist, "artist", 40),
    ],
    publishing: [
      split("publishing", author, "author", 35),
      split("publishing", composer, "composer", 35),
      split("publishing", `${label} Publishing`, "publisher", 30),
    ],
  };
}

export function fakeDeclaration(organism: Organism) {
  return {
    status: pick(["submitted", "confirmed"] as const),
    reference: `${organism.toUpperCase()}-${digits(6)}`,
    declared_on: daysAgo(5 + Math.floor(Math.random() * 20)),
    notes: null,
  };
}

/** Fits ISRC_PATTERN and ISWC (T + 10 digits); "TST" marks them as test codes. */
export const fakeIsrc = () =>
  `FRTST${String(new Date().getUTCFullYear() % 100).padStart(2, "0")}${digits(5)}`;
export const fakeIswc = () => `T${digits(10)}`;

/** One second of silence, 8 kHz mono 16 bits: a real, playable WAV. */
export function silentWav(): Blob {
  const rate = 8000;
  const data = rate * 2;
  const buffer = new ArrayBuffer(44 + data);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) =>
    [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  text(0, "RIFF");
  view.setUint32(4, 36 + data, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, data, true);
  return new Blob([buffer], { type: "audio/wav" });
}

/** A 1 × 1 grey PNG, as artwork. */
export function tinyPng(): Blob {
  const base64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  return new Blob([Buffer.from(base64, "base64")], { type: "image/png" });
}
