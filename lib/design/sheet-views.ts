import "server-only";

import type { DesignJourneyContext } from "@/lib/design/journey-context";
import { missingFields, type SheetFieldView } from "@/lib/design/sheet-model";
import {
  fieldsFor,
  itemDates,
  loadSheetSources,
} from "@/lib/design/sheet-proposals";

/** Every sheet with its fields (written or proposed) and what it lacks. */
export async function loadSheetViews(ctx: DesignJourneyContext) {
  const sources = await loadSheetSources(ctx.project.id);
  return ctx.sheets.map((s) => {
    const deliverable = ctx.data.deliverables.find(
      (d) => d.id === s.facts.sheet.design_deliverable_id,
    );
    const fields: SheetFieldView[] = fieldsFor(
      s.facts,
      deliverable,
      ctx.data,
      sources,
    );
    const dates = itemDates(deliverable, sources);
    return {
      ...s,
      deliverable,
      fields,
      missing: missingFields(fields),
      items: s.facts.items.map((item) => ({
        ...item,
        proposedDate: dates[item.number - 1] ?? null,
      })),
    };
  });
}
export type SheetView = Awaited<ReturnType<typeof loadSheetViews>>[number];
