// The « dossier de livraison » (ticket « Distribution » § 6.4, § 12): what
// will be typed by hand into The Orchard, in sections close to its
// vocabulary (Release, Tracks, Artwork, Territories & Rights, Pricing &
// Dates, Notes) without claiming to reproduce its screens or statuses. Each
// field says where its value comes from; nothing here is editable but the
// distribution's own parameters. Pure: built from lib/distribution/sources.ts
// and the readiness of lib/distribution/readiness.ts.

import { countryName } from "@/lib/catalog/countries";
import type { DossierParams } from "@/lib/distribution/dossier";
import type {
  Readiness,
  ReadinessInput,
  ReadinessState,
  SourceModule,
} from "@/lib/distribution/readiness";
import { distribution } from "@/lib/i18n/fr/distribution";
import { masterPage } from "@/lib/i18n/fr/master-page";

const fr = { distribution, masterPage };

export type FieldOrigin = SourceModule | "distribution";

export type DossierField = {
  key: string;
  label: string;
  // null: nothing at the source (said « Manquant » or « À renseigner »).
  value: string | null;
  origin: FieldOrigin;
  // The source's state, for a field read from a module.
  state: ReadinessState | null;
  // Where it is corrected (its owner module), or null for a parameter.
  href: string | null;
};

export type DossierSection = {
  key: "release" | "tracks" | "artwork" | "territories" | "pricing" | "notes";
  title: string;
  // The Orchard's own word for the section, as a landmark.
  orchard: string;
  // Per title for the tracks: one group each.
  groups: Array<{ key: string; title: string | null; fields: DossierField[] }>;
};

export function deliveryFile(input: {
  sources: ReadinessInput;
  readiness: Readiness;
  params: DossierParams;
  credits: Record<string, Array<{ name: string; role: string }>>;
  label: string | null;
  // « Single », « EP »… from the project.
  format: string | null;
  // The project's main artist, for the release.
  artist: string | null;
  formatDate: (iso: string) => string;
}): DossierSection[] {
  const t = fr.distribution.dossier;
  const { sources, readiness, params } = input;
  const item = (key: string) =>
    readiness.items.find((candidate) => candidate.key === key);
  const fromItem = (
    key: string,
    label: string,
    value: string | null,
  ): DossierField => {
    const source = item(key);
    return {
      key,
      label,
      value,
      origin: source?.module ?? "project",
      state: source?.state ?? null,
      href: source?.href ?? null,
    };
  };
  const param = (
    key: string,
    label: string,
    value: string | null,
  ): DossierField => ({
    key,
    label,
    value,
    origin: "distribution",
    state: null,
    href: null,
  });
  const yesNo = (value: boolean | null, on: string | null) =>
    value === null
      ? null
      : value
        ? on
          ? t.yesOn(input.formatDate(on))
          : t.yes
        : t.no;

  const release = sources.release;
  // A collective's title release (lot 15): delivered under its track's
  // name as the platforms write it, « Marina (feat. Lou Vega) ».
  const single =
    sources.collective?.kind === "title"
      ? (sources.titles[0]?.delivery ?? null)
      : null;
  const sections: DossierSection[] = [
    {
      key: "release",
      title: t.sections.release,
      orchard: "Release",
      groups: [
        {
          key: "release",
          title: null,
          fields: [
            fromItem(
              "release",
              t.fields.releaseTitle,
              release ? (single?.title ?? release.title) : null,
            ),
            {
              key: "artist",
              label: t.fields.mainArtist,
              value: input.artist,
              origin: "catalog",
              state: input.artist ? "available" : "missing",
              href: null,
            },
            {
              key: "label",
              label: t.fields.label,
              value: input.label,
              origin: "project",
              state: input.label ? "available" : "missing",
              href: null,
            },
            {
              key: "format",
              label: t.fields.format,
              value: input.format,
              origin: "project",
              state: input.format ? "available" : "missing",
              href: null,
            },
            fromItem("upc", t.fields.upc, release?.upc ?? null),
            fromItem(
              "releaseDate",
              t.fields.releaseDate,
              sources.releaseDate
                ? input.formatDate(sources.releaseDate.date)
                : null,
            ),
          ],
        },
      ],
    },
    {
      key: "tracks",
      title: t.sections.tracks,
      orchard: "Tracks",
      groups: sources.titles.map((title, index) => {
        const credits = input.credits[title.id] ?? [];
        const songwriters = credits
          .filter((c) => c.role === "composer" || c.role === "lyricist")
          .map(
            (c) =>
              `${c.name} (${fr.masterPage.credits.roles[c.role as "composer" | "lyricist"]})`,
          );
        const others = credits.filter(
          (c) => c.role !== "composer" && c.role !== "lyricist",
        );
        const audio = title.final
          ? t.audioFinal(title.final.number)
          : title.before
            ? t.audioBefore
            : null;
        return {
          key: title.id,
          title: t.track(index + 1, title.label),
          fields: [
            ...(title.delivery
              ? [
                  // A collective's track (lot 15): the platforms' rules applied.
                  fromItem(
                    `platforms-${title.id}`,
                    t.fields.trackTitle,
                    title.delivery.title,
                  ),
                  fromItem(
                    `platforms-${title.id}`,
                    t.fields.trackArtists,
                    title.delivery.main,
                  ),
                  fromItem(
                    `platforms-${title.id}`,
                    t.fields.featuring,
                    title.delivery.featuring.length
                      ? title.delivery.featuring.join(", ")
                      : t.noFeaturing,
                  ),
                ]
              : [
                  fromItem(
                    `identity-${title.id}`,
                    t.fields.trackTitle,
                    title.label,
                  ),
                  fromItem(
                    `identity-${title.id}`,
                    t.fields.trackArtists,
                    title.hasMainArtist ? title.artists : null,
                  ),
                ]),
            fromItem(`isrc-${title.id}`, t.fields.isrc, title.isrc),
            fromItem(
              `pline-${title.id}`,
              t.fields.pLine,
              title.rightsHolder && title.rightsYear
                ? `℗ ${title.rightsYear} ${title.rightsHolder}`
                : null,
            ),
            fromItem(
              `credits-${title.id}`,
              t.fields.songwriters,
              songwriters.length ? songwriters.join(", ") : null,
            ),
            {
              key: `others-${title.id}`,
              label: t.fields.otherCredits,
              value: others.length
                ? others
                    .map(
                      (c) =>
                        `${c.name} (${
                          (
                            fr.masterPage.credits.roles as Record<
                              string,
                              string
                            >
                          )[c.role] ?? c.role
                        })`,
                    )
                    .join(", ")
                : t.none,
              origin: "catalog",
              state: "available",
              href: item(`credits-${title.id}`)?.href ?? null,
            },
            fromItem(`final-${title.id}`, t.fields.audio, audio),
          ],
        };
      }),
    },
    {
      key: "artwork",
      title: t.sections.artwork,
      orchard: "Artwork",
      groups: [
        {
          key: "artwork",
          title: null,
          fields: [
            fromItem(
              "cover",
              t.fields.cover,
              // A title's release (lot 15): its title's cover, Catalogue,
              // unless the Production delivered one for it (M7).
              sources.collective?.kind === "title" && !sources.cover?.delivered
                ? sources.collective.catalogCover?.fileName
                  ? fr.distribution.readiness.collective.coverFile(
                      sources.collective.catalogCover.fileName,
                    )
                  : null
                : sources.cover
                  ? sources.cover.delivered
                    ? fr.distribution.readiness.details.coverDelivered(
                        sources.cover.title,
                        sources.cover.delivered.version,
                      )
                    : fr.distribution.readiness.details.coverStatus(
                        sources.cover.title,
                        fr.distribution.readiness.details.coverNotDelivered,
                      )
                  : null,
            ),
          ],
        },
      ],
    },
    {
      key: "territories",
      title: t.sections.territories,
      orchard: "Territories & Rights",
      groups: [
        {
          key: "territories",
          title: null,
          fields: [
            param("territories", t.fields.territories, territoriesText(params)),
            {
              key: "legal",
              label: t.fields.legal,
              // The borrowings to secure, readable by all
              // (distribution_legal_blockers).
              value: sources.legal.blockers.length
                ? sources.legal.blockers
                    .map((b) => t.clearanceToSecure(b.work))
                    .join(" · ")
                : t.noClearanceToSecure,
              origin: "legal",
              state: sources.legal.blockers.length ? "missing" : "validated",
              href: null,
            },
            ...sources.constraints.map((constraint) =>
              fromItem(
                `constraint-${constraint.id}`,
                t.fields.constraint,
                constraint.text,
              ),
            ),
          ],
        },
      ],
    },
    {
      key: "pricing",
      title: t.sections.pricing,
      orchard: "Pricing & Dates",
      groups: [
        {
          key: "pricing",
          title: null,
          fields: [
            param(
              "priceTier",
              t.fields.priceTier,
              params.priceTier ? t.priceTiers[params.priceTier] : null,
            ),
            param(
              "preorder",
              t.fields.preorder,
              yesNo(params.preorder, params.preorderOn),
            ),
            param(
              "prelisten",
              t.fields.prelisten,
              yesNo(params.prelisten, params.prelistenOn),
            ),
          ],
        },
      ],
    },
    {
      key: "notes",
      title: t.sections.notes,
      orchard: "Notes",
      groups: [
        {
          key: "notes",
          title: null,
          fields: [param("notes", t.fields.notes, params.notes ?? t.none)],
        },
      ],
    },
  ];
  return sections;
}

/** « Monde entier », « Seulement : France, Belgique », « Monde sauf : … ». */
export function territoriesText(params: DossierParams): string {
  const t = fr.distribution.dossier;
  if (params.territoryMode === "world") return t.territoryModes.world;
  const names = params.territories
    .map((code) => countryName(code) ?? code)
    .join(", ");
  return params.territoryMode === "include"
    ? t.territoriesOnly(names)
    : t.territoriesExcept(names);
}

/** The parameters still to say (§ 6.5): shown, never blocking by themselves
 * until the dossier is submitted (lot 3). */
export function missingParams(params: DossierParams): string[] {
  const t = fr.distribution.dossier.fields;
  return [
    params.priceTier === null ? t.priceTier : null,
    params.preorder === null ? t.preorder : null,
    params.prelisten === null ? t.prelisten : null,
  ].filter((value): value is string => value !== null);
}
