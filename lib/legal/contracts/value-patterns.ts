// The values of a filled contract the code recognises by their shape:
// e-mail, phone, SIRET, IPI. No model is needed for them, and none is
// trusted with them. Whose they are (the person's or the label's) is for
// the person to say: each one is only proposed. Client-safe.

import type { ContractFieldId } from "./fields";
import { bodySegments } from "./template-text";

const SPACE = "[ \\u00a0]?";
const PATTERNS: Array<{ field: ContractFieldId; re: RegExp; group?: number }> =
  [
    {
      field: "personne.siret",
      re: new RegExp(
        `(?<!\\d)\\d{3}${SPACE}\\d{3}${SPACE}\\d{3}${SPACE}\\d{5}(?!\\d)`,
        "g",
      ),
    },
    {
      field: "personne.ipi",
      re: /\b(?:IPI|COAD)\b[^\d\n]{0,20}(\d{9,11})(?!\d)/g,
      group: 1,
    },
    {
      field: "personne.email",
      re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    },
    {
      field: "personne.telephone",
      re: /(?<![\d+])(?:\+33[  ]?|0)[1-9](?:[  .-]?\d{2}){4}(?!\d)/g,
    },
  ];

/** Each value found, once, with its field, in the order of the patterns. */
export function valuesByShape(
  body: string,
): Array<{ excerpt: string; field: ContractFieldId }> {
  const found = new Map<string, ContractFieldId>();
  for (const segment of bodySegments(body)) {
    if (segment.kind !== "text") continue;
    // A number already taken (a SIRET) is not read again (as a phone).
    const taken: Array<[number, number]> = [];
    for (const { field, re, group } of PATTERNS) {
      for (const match of segment.text.matchAll(re)) {
        const excerpt = match[group ?? 0];
        const start = match.index + match[0].indexOf(excerpt);
        const end = start + excerpt.length;
        if (taken.some(([a, b]) => start < b && end > a)) continue;
        taken.push([start, end]);
        if (!found.has(excerpt)) found.set(excerpt, field);
      }
    }
  }
  return [...found].map(([excerpt, field]) => ({ excerpt, field }));
}
