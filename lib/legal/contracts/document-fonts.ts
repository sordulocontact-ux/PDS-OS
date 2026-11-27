// The typeface of a contract, taken from its Word file (Sacha 25/11/2026:
// « récupérer la typo du contrat »). A Word font of Microsoft (Calibri,
// Cambria, Times New Roman, Arial…) can be neither shipped nor printed on the
// server: it becomes its free twin of the same metrics (Carlito, Caladea,
// Tinos, Arimo…), so that lines break where Word breaks them. Each one is a
// Google Font (OFL or Apache), loaded by the page, the preview and the PDF.
// A font of no known twin keeps the contracts' default look (Arial).
// Client-safe.

export const DOCUMENT_FONTS = {
  carlito: {
    family: "Carlito",
    generic: "sans-serif",
    word: ["calibri", "calibri light", "carlito"],
  },
  caladea: {
    family: "Caladea",
    generic: "serif",
    word: ["cambria", "caladea"],
  },
  tinos: {
    family: "Tinos",
    generic: "serif",
    word: ["times new roman", "times", "liberation serif", "tinos"],
  },
  arimo: {
    family: "Arimo",
    generic: "sans-serif",
    word: ["arial", "helvetica", "helvetica neue", "liberation sans", "arimo"],
  },
  cousine: {
    family: "Cousine",
    generic: "monospace",
    word: ["courier new", "courier", "liberation mono", "cousine"],
  },
  gelasio: {
    family: "Gelasio",
    generic: "serif",
    word: ["georgia", "gelasio"],
  },
  "eb-garamond": {
    family: "EB Garamond",
    generic: "serif",
    word: ["garamond", "eb garamond", "adobe garamond pro"],
  },
  roboto: { family: "Roboto", generic: "sans-serif", word: ["roboto"] },
  "open-sans": {
    family: "Open Sans",
    generic: "sans-serif",
    word: ["open sans"],
  },
  lato: { family: "Lato", generic: "sans-serif", word: ["lato"] },
  montserrat: {
    family: "Montserrat",
    generic: "sans-serif",
    word: ["montserrat"],
  },
  "source-sans-3": {
    family: "Source Sans 3",
    generic: "sans-serif",
    word: ["source sans pro", "source sans 3"],
  },
  "noto-sans": {
    family: "Noto Sans",
    generic: "sans-serif",
    word: ["noto sans"],
  },
  "noto-serif": {
    family: "Noto Serif",
    generic: "serif",
    word: ["noto serif"],
  },
  merriweather: {
    family: "Merriweather",
    generic: "serif",
    word: ["merriweather"],
  },
  "pt-serif": { family: "PT Serif", generic: "serif", word: ["pt serif"] },
  "libre-baskerville": {
    family: "Libre Baskerville",
    generic: "serif",
    word: ["libre baskerville", "baskerville", "baskerville old face"],
  },
  inter: { family: "Inter", generic: "sans-serif", word: ["inter"] },
} as const;

export type DocumentFont = keyof typeof DOCUMENT_FONTS;

export const DOCUMENT_FONT_IDS = Object.keys(DOCUMENT_FONTS) as DocumentFont[];

export const isDocumentFont = (value: unknown): value is DocumentFont =>
  typeof value === "string" && Object.hasOwn(DOCUMENT_FONTS, value);

/** The font a Word font name is printed in, or null (the default look). */
export function documentFontOf(
  name: string | null | undefined,
): DocumentFont | null {
  const wanted = name?.trim().toLowerCase().replace(/\s+/g, " ");
  if (!wanted) return null;
  return (
    DOCUMENT_FONT_IDS.find((id) =>
      (DOCUMENT_FONTS[id].word as readonly string[]).includes(wanted),
    ) ?? null
  );
}

/** Its regular and bold faces, latin, from Google Fonts. */
export const documentFontHref = (font: DocumentFont) =>
  `https://fonts.googleapis.com/css2?family=${DOCUMENT_FONTS[font].family.replaceAll(" ", "+")}:ital,wght@0,400;0,700&display=block`;

/** The text in that font, on `scope[data-font="…"]`: one rule per font. */
export const documentFontCss = (scope: string) =>
  DOCUMENT_FONT_IDS.map(
    (id) =>
      `${scope}[data-font="${id}"] { font-family: "${DOCUMENT_FONTS[id].family}", ${DOCUMENT_FONTS[id].generic}; }`,
  ).join("\n  ");
