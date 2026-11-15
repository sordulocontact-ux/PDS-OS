// The two typefaces of the shared Plan de sortie and its PDF (lot 14), set
// here only: the renderer reads nothing else.
//
// The plan Jeho sets its big condensed capitals in SegmentA Key Bold, a
// commercial face with no free web licence: League Gothic (Google Fonts,
// SIL OFL) at 75 % width is the closest free one — the same narrow capitals,
// « MOODBOARD DES CONTENUS » within a few pixels of the reference — compared
// with Six Caps (too thin), Sofia Sans Extra Condensed and Smooch Sans (too
// wide). Once a SegmentA web licence is bought, change DISPLAY_FONT only.
// Its texts are in HK Grotesk, published on Google Fonts as Hanken Grotesk.
// Client-safe.

export type DeckFont = {
  // The CSS font-family.
  family: string;
  // The Google Fonts css2 `family=` value.
  google: string;
  weight: number;
  // CSS font-stretch (a width axis), or "normal".
  stretch: string;
};

export const DISPLAY_FONT: DeckFont = {
  family: "League Gothic",
  google: "League+Gothic:wdth@75",
  weight: 400,
  stretch: "75%",
};

export const TEXT_FONT: DeckFont = {
  family: "Hanken Grotesk",
  google: "Hanken+Grotesk:wght@400;700",
  weight: 400,
  stretch: "normal",
};
