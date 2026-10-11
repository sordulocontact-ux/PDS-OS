// The fields an agency's file is mapped to, per kind of activation (ticket
// Influence § B.3, ATYR reference : Catégorie, @, Statut, Liens profils,
// Abonnés, Likes, Indice d'engagement, Liens vidéo TikTok, Code Sponso ;
// ticket RP § 6.1 : média, journaliste, type d'action, angle, priorité,
// échéance, commentaire, état agence). Unknown columns stay in the raw row.
// Client-safe.

export const AGENCY_FIELDS = {
  influence: [
    "name",
    "handle",
    "platform",
    "category",
    "followers",
    "likes",
    "engagement",
    "views",
    "comments",
    "saves",
    "shares",
    "profile_url",
    "video_url",
    "sponsor_code",
    "agency_status",
  ],
  press: [
    "media",
    "journalist",
    "action_type",
    "angle",
    "priority",
    "due",
    "comment",
    "coverage_url",
    "agency_status",
  ],
} as const;

export type AgencyField =
  | (typeof AGENCY_FIELDS)["influence"][number]
  | (typeof AGENCY_FIELDS)["press"][number];

export const NUMERIC_FIELDS: readonly AgencyField[] = [
  "followers",
  "likes",
  "engagement",
  "views",
  "comments",
  "saves",
  "shares",
];
export const URL_FIELDS: readonly AgencyField[] = [
  "profile_url",
  "video_url",
  "coverage_url",
];

/** The metric a numeric column feeds when its statistics are imported. */
export const METRIC_OF_FIELD = {
  views: "views",
  likes: "likes",
  comments: "comments",
  saves: "saves",
  shares: "shares",
  engagement: "engagement_rate",
} as const;

export const DEFAULT_KEY_FIELDS = {
  influence: ["handle", "platform"],
  press: ["media", "journalist"],
} as const satisfies Record<"influence" | "press", readonly AgencyField[]>;

// Header words that propose a field (normalized : no accents, lower case).
const SYNONYMS: Array<[AgencyField, RegExp]> = [
  ["handle", /^@$|pseudo|handle|compte|username/],
  ["name", /^nom|^name|influenceu|createur|creator|profil$/],
  ["platform", /plateforme|platform|reseau/],
  ["category", /categor|tier/],
  ["followers", /abonn|follower|audience/],
  ["likes", /^likes?$|j'aime/],
  ["engagement", /engagement/],
  ["views", /vues|views/],
  ["comments", /comment(aire)?s?$/],
  ["saves", /enregistr|saves?/],
  ["shares", /partage|shares?/],
  ["profile_url", /liens? profil|profile|url profil/],
  ["video_url", /liens? video|video/],
  ["sponsor_code", /code/],
  ["agency_status", /statut|status|etat/],
  ["media", /media|support|titre de presse/],
  ["journalist", /journalist|contact/],
  ["action_type", /type/],
  ["angle", /angle/],
  ["priority", /priorit/],
  ["due", /echeance|date|deadline/],
  ["comment", /comment|remarque|note/],
  ["coverage_url", /lien|url|retombee/],
];

export const normalizeHeader = (h: string) =>
  h
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();

/** A mapping proposed by code from the headers ; the person confirms it. */
export function proposeMapping(
  headers: string[],
  kind: "influence" | "press",
  previous: Record<string, string> = {},
): Record<string, string> {
  const fields: readonly AgencyField[] = AGENCY_FIELDS[kind];
  const mapping: Record<string, string> = {};
  const used = new Set<string>();
  // An earlier mapping is kept where its column is still there.
  for (const [field, header] of Object.entries(previous))
    if (
      headers.includes(header) &&
      (fields as readonly string[]).includes(field)
    ) {
      mapping[field] = header;
      used.add(header);
    }
  for (const [field, pattern] of SYNONYMS) {
    if (!fields.includes(field) || mapping[field]) continue;
    const header = headers.find(
      (h) => !used.has(h) && pattern.test(normalizeHeader(h)),
    );
    if (header) {
      mapping[field] = header;
      used.add(header);
    }
  }
  return mapping;
}
