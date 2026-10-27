// The lines of the Brief créatif said the same way on the page and in its
// PDF (MKT-C2-12): one wording, two renders.

import type { CreativeBriefContent } from "@/lib/design/brief";
import { formatBriefDate } from "@/lib/framing/assess";
import { conceptionDirection } from "@/lib/i18n/fr/conception-direction";
import { conceptionKinds } from "@/lib/i18n/fr/conception-kinds";

const fr = { conceptionKinds, conceptionDirection };

type Content = CreativeBriefContent;
type Sheet = NonNullable<Content["deliverables"][number]["sheet"]>;

const t = () => fr.conceptionDirection.brief;
const topic = (key: keyof typeof fr.conceptionDirection.topics) =>
  fr.conceptionDirection.topics[key];

export const coherenceLine = (x: Content["coherence"][number]) =>
  `${topic(x.topic)} : ${x.value} — ${t().sharedBy(x.deliverables)}`;

export const intentionLine = (
  i: Content["deliverables"][number]["intentions"][number],
) => `${topic(i.topic)} : ${i.value}`;

export function referenceLine(r: Content["references"][number]): string {
  const kinds = fr.conceptionKinds;
  const type =
    r.type && r.type in kinds.types
      ? kinds.types[r.type as keyof typeof kinds.types]
      : null;
  const usage =
    r.usage && r.usage in kinds.usages
      ? kinds.usages[r.usage as keyof typeof kinds.usages]
      : null;
  const kind = type ? ` (${t().document.referenceKind(type, usage)})` : "";
  const note = r.note ? ` · ${r.note}` : "";
  return `${r.label}${kind} — ${r.targets.join(", ")}${note}`;
}

export const decisionLine = (d: Content["decisions"][number]) =>
  t().decision(d.version, d.section, d.decision) +
  (d.comment ? ` — ${d.comment}` : "") +
  (d.reserves ? ` · ${t().document.reserves(d.reserves)}` : "");

const day = (date: string | null) => (date ? formatBriefDate(date) : null);

/** Who carries the sheet, who decides, and when it is delivered. */
export const sheetLine = (s: Sheet) =>
  t().document.sheetLine(
    t().document.kinds[s.kind],
    s.responsible,
    s.validators.join(", "),
    day(s.deliveryDate),
  );

/** A series' contents, each with its own concept, responsible and date. */
export const sheetItemLines = (s: Sheet) =>
  s.kind === "series"
    ? s.items.map((i) => {
        const rest = t().document.itemLine(
          i.concept,
          i.responsible,
          day(i.deliveryDate),
        );
        return `${t().document.item(i.number, i.title)}${rest ? ` — ${rest}` : ""}`;
      })
    : [];
