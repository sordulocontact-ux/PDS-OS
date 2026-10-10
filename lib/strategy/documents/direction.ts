// The visual direction of an external document (ticket Stratégie § 11, step
// 5): a theme, its colours and a typographic pairing, proposed from the
// references the owner selected, then validated or modified by them.
//
// The technology behind a proposal is not frozen: every proposer takes the
// same input (what the selected images look like) and returns a Direction.
// Today's one, `paletteProposer`, is plain arithmetic on the images' colours
// (read in the browser, components/strategy/release-plan/use-image-reading);
// another one (a model, a designer's presets) can replace it behind
// `proposeDirection` without touching the generator nor the renderer.
// Client-safe.

import { z } from "zod";

export const THEMES = ["night", "paper", "color"] as const;
export type Theme = (typeof THEMES)[number];

export const FONT_PAIRINGS = {
  grotesk: { heading: "Space Grotesk", body: "Inter" },
  serif: { heading: "Playfair Display", body: "Source Serif 4" },
  mono: { heading: "Space Mono", body: "IBM Plex Sans" },
} as const;
export type FontPairing = keyof typeof FONT_PAIRINGS;
const PAIRINGS = Object.keys(FONT_PAIRINGS) as FontPairing[];

const hex = z.string().regex(/^#[0-9a-f]{6}$/i);

export const directionSchema = z.object({
  theme: z.enum(THEMES),
  background: hex,
  ink: hex,
  accent: hex,
  fonts: z.enum(PAIRINGS as [FontPairing, ...FontPairing[]]),
  // The references' colours (the moodboard's palette).
  palette: z.array(hex).max(6),
  // « Valider »: a proposal stays a proposal until the owner chooses it.
  accepted: z.boolean(),
  // Which proposal it is (« Voir une autre proposition » moves it on).
  seed: z.number().int().min(0).max(1000),
});
export type Direction = z.infer<typeof directionSchema>;

/** What the selected images look like, read in the browser. */
export type ImageReading = {
  // Most frequent colours first.
  palette: string[];
  // Mean lightness and saturation, 0 to 1; null without a readable image.
  lightness: number | null;
  saturation: number | null;
};

export type DirectionProposer = (
  reading: ImageReading,
  seed: number,
) => Direction;

const channel = (h: string, i: number) => parseInt(h.slice(i, i + 2), 16);

/** Light or dark ink on a colour, by its relative luminance. */
export function inkOn(color: string): "#111111" | "#f5f5f5" {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = channel(color, i) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#111111" : "#f5f5f5";
}

const saturationOf = (h: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => channel(h, i));
  const max = Math.max(r, g, b);
  return max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
};

/**
 * Today's proposer: dark images call for a night theme, saturated ones for a
 * flat colour, the rest for paper; the accent is the most saturated colour.
 * Each next seed moves to the next theme, accent and pairing, so « Voir une
 * autre proposition » always shows something different.
 */
export const paletteProposer: DirectionProposer = (reading, seed) => {
  const first: Theme =
    reading.lightness === null
      ? "paper"
      : reading.lightness < 0.38
        ? "night"
        : (reading.saturation ?? 0) > 0.42
          ? "color"
          : "paper";
  const themes: Theme[] = [first, ...THEMES.filter((t) => t !== first)];
  const accents = [...reading.palette].sort(
    (a, b) => saturationOf(b) - saturationOf(a),
  );
  const theme = themes[seed % themes.length];
  const accent = accents.length ? accents[seed % accents.length] : "#1f1f1f";
  const fonts = PAIRINGS[seed % PAIRINGS.length];
  const base =
    theme === "night"
      ? { background: "#0e0e0e", ink: "#f2f2f2" }
      : theme === "paper"
        ? { background: "#fbfaf7", ink: "#111111" }
        : { background: accent, ink: inkOn(accent) };
  return {
    theme,
    ...base,
    // On a flat colour, the accent is the ink itself.
    accent: theme === "color" ? base.ink : accent,
    fonts,
    palette: reading.palette.slice(0, 6),
    accepted: false,
    seed,
  };
};

/** The proposer in use (see the note at the top of this file). */
export const proposeDirection: DirectionProposer = paletteProposer;

/** Muted ink and hairline derived from a direction, for the renderer. */
export function shadesOf(direction: Direction) {
  const dark = inkOn(direction.background) === "#f5f5f5";
  return {
    muted: dark ? "#a3a3a3" : "#6b6b6b",
    line: dark ? "#ffffff2e" : "#0000001f",
  };
}
