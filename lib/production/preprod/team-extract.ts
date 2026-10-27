// Préproduction › Briefs d'équipe: the extract each team receives, computed
// by code from the Fiche Livrable, the director's brief and the sheet —
// never rewritten by PO. The production team only gets the logistics (no
// creative nor budget data). Client-safe.

import { productionBrief } from "@/lib/i18n/fr/production-brief";
import { productionPrep } from "@/lib/i18n/fr/production-prep";
import { productionPreprod } from "@/lib/i18n/fr/production-preprod";
import { ficheDuration } from "@/lib/production/heritage-facts";
import { effectiveLogistics } from "@/lib/production/logistics";
import type { ProductionSheetData } from "@/lib/production/sheet";
import { formatDate } from "@/lib/release/format";

import type { ExtractLine, Team } from "./team-briefs";

const fr = { productionPrep, productionBrief, productionPreprod };

const t = fr.productionPreprod.briefs.lines;
const choices = fr.productionBrief.choices;

const join = (...parts: (string | null | undefined)[]) =>
  parts.filter((p): p is string => Boolean(p?.trim())).join(" · ") || null;

type Input = Pick<ProductionSheetData, "heritage" | "sheet">;

export function teamExtract(
  team: Team,
  { heritage, sheet }: Input,
): ExtractLine[] {
  const fiche = heritage.fiche;
  const brief = sheet?.brief;
  const logistics = sheet?.logistics;
  const formats = fiche
    ? join(fiche.ratios.join(", ") || null, ficheDuration(fiche))
    : null;
  const location = join(
    logistics?.locationName,
    logistics?.locationAddress,
    logistics?.locationAccess,
  );
  const constraints = join(fiche?.constraints, brief?.constraintsNote);
  const shoot = effectiveLogistics(logistics ?? null, fiche).shootDate.value;
  switch (team) {
    case "director":
      return [
        { label: t.concept, value: fiche?.concept ?? null },
        { label: t.intention, value: fiche?.intention ?? null },
        ...heritage.intentions
          .filter((i) => i.scope === "deliverable")
          .map((i) => ({
            label: fr.productionPrep.heritage.topics[i.topic],
            value: i.value,
          })),
        { label: t.formats, value: formats },
        {
          label: t.items,
          value:
            fiche && fiche.items.length > 0
              ? fiche.items.map((i) => `${i.number}. ${i.title}`).join(" · ")
              : null,
        },
        { label: t.staging, value: brief?.stagingIntent ?? null },
        { label: t.constraints, value: constraints },
        { label: t.leftToProduction, value: fiche?.productionNotes ?? null },
      ];
    case "camera":
      return [
        {
          label: t.coverage,
          value: join(
            brief?.coverage ? choices.coverage[brief.coverage].label : null,
            brief?.coverageNote,
          ),
        },
        {
          label: t.camera,
          value: join(
            brief?.cameraSetup
              ? choices.cameraSetup[brief.cameraSetup].label
              : null,
            brief?.cameraNote,
          ),
        },
        { label: t.runOfShow, value: brief?.runOfShow ?? null },
        {
          label: t.references,
          value: join(
            ...(fiche?.references ?? []).map((r) => r.title ?? r.url),
            ...heritage.references.map((r) => r.note ?? r.url),
            brief?.referencesNote,
          ),
        },
        { label: t.location, value: location },
        { label: t.formats, value: formats },
      ];
    case "sound":
      return [
        {
          label: t.capture,
          value: join(
            brief?.soundCapture
              ? choices.soundCapture[brief.soundCapture].label
              : null,
            brief?.soundNote,
          ),
        },
        { label: t.location, value: location },
      ];
    case "performers":
      return [
        { label: t.runOfShow, value: brief?.runOfShow ?? null },
        { label: t.constraints, value: constraints },
      ];
    case "production":
      return [
        { label: t.location, value: location },
        { label: t.shootDate, value: shoot ? formatDate(shoot) : null },
        { label: t.constraints, value: constraints },
      ];
  }
}
