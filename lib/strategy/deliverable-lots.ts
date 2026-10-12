// Lots of deliverables a lever usually commits to (MKT-S1-08), proposed by
// code from the lever's words — never by PO — to tick, adjust and create in
// one go. A title already in the lever is not proposed again. Labels in
// fr.strategyDeliverables.lots. Client-safe.

import { fr } from "@/lib/i18n/fr";

type LotKey = keyof typeof fr.strategyDeliverables.lots.items;
type Lot = Array<{ key: LotKey; quantity: number }>;

const LOTS: Array<[RegExp, Lot]> = [
  [
    /clip|video|tournage/,
    [
      { key: "clip", quantity: 1 },
      { key: "teaser", quantity: 3 },
      { key: "making_of", quantity: 1 },
    ],
  ],
  [
    /social|reseau|tiktok|instagram|organique|contenu/,
    [
      { key: "short_videos", quantity: 6 },
      { key: "post_visuals", quantity: 4 },
      { key: "stories", quantity: 5 },
    ],
  ],
  [
    /influen/,
    [
      { key: "influencer_brief", quantity: 1 },
      { key: "influencer_contents", quantity: 5 },
    ],
  ],
  [
    /presse|rp\b|media/,
    [
      { key: "press_kit", quantity: 1 },
      { key: "press_release", quantity: 1 },
      { key: "press_photos", quantity: 3 },
    ],
  ],
  [
    /playlist/,
    [
      { key: "playlist_pitch", quantity: 1 },
      { key: "playlist_targets", quantity: 1 },
    ],
  ],
  [
    /pub|ads|sponsor|campagne/,
    [
      { key: "ad_creatives", quantity: 4 },
      { key: "ad_targeting", quantity: 1 },
    ],
  ],
  [
    /radio/,
    [
      { key: "radio_edit", quantity: 1 },
      { key: "radio_pitch", quantity: 1 },
    ],
  ],
  [
    /live|showcase|concert|evenement/,
    [
      { key: "showcase", quantity: 1 },
      { key: "event_poster", quantity: 1 },
    ],
  ],
  [/partenari|marque/, [{ key: "partner_deck", quantity: 1 }]],
];

const fold = (text: string) =>
  text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

export type LotItem = { title: string; quantity: number };

/** The lot a lever suggests, minus the titles it already holds. */
export function lotForLever(
  leverLabel: string,
  existingTitles: string[],
): LotItem[] {
  const t = fr.strategyDeliverables.lots.items;
  const label = fold(leverLabel);
  const lot = LOTS.find(([pattern]) => pattern.test(label))?.[1] ?? [];
  const taken = new Set(existingTitles.map(fold));
  return lot
    .map((i) => ({ title: t[i.key], quantity: i.quantity }))
    .filter((i) => !taken.has(fold(i.title)));
}
