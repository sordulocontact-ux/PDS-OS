/**
 * A frame inside other frames (Sacha, 10/11/2026: « chaque cadre où ils sont
 * dans plusieurs cadres en même temps »): filled one step lighter than the
 * card it sits in, with a thin white outline (`--border-hairline`, Sacha
 * 10/11/2026: « un petit contour blanc au fond clair »). In dark mode, lighter reads as above. Only where a frame is
 * already inside a card that is itself inside one (the SACEM bulletin's
 * participants, publishers, categories and DEP/DR preview); a frame directly
 * in a card keeps its outline. docs/DESIGN.md « Cadre dans des cadres ».
 */
export const nestedCardClass = "rounded-xl border border-[color:var(--border-hairline)] bg-[var(--surface-tint)] p-4";
