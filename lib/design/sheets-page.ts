import "server-only";

import type { Access } from "@/lib/auth/access";
import { loadConception, type ConceptionData } from "@/lib/design/conception";
import { loadDesignPeople, type DesignPeople } from "@/lib/design/people";
import { loadSheets, type SheetFull } from "@/lib/design/sheets";
import type { ProjectDetail } from "@/lib/projects/types";

export type SheetsPageData = {
  data: ConceptionData;
  people: DesignPeople;
  sheets: SheetFull[];
};

/**
 * What the Fiches Livrables pages read: the Conception, its people, and the
 * sheets with their checks (who holds them, the Stratégie's dates for their
 * deliverable). One sheet only when `sheetId` is given.
 */
export async function loadSheetsPage(
  project: Pick<ProjectDetail, "id" | "ownerPersonId" | "dueDate" | "stages">,
  access: Access,
  sheetId?: string,
): Promise<SheetsPageData | null> {
  const data = await loadConception(project, access);
  if (!data) return null;
  const people = await loadDesignPeople(
    project.id,
    data.organizationId,
    access,
  );
  const sheets = await loadSheets(
    project.id,
    (sheet) => {
      const scope = people.sheets[sheet.id];
      const deliverable = data.deliverables.find(
        (d) => d.id === sheet.design_deliverable_id,
      );
      return {
        responsibleId: scope?.responsible?.personId ?? null,
        validatorIds: (scope?.validators ?? []).map((v) => v.personId),
        strategyDue: deliverable?.dueDate ?? null,
        milestoneDate: deliverable?.milestone?.date ?? null,
      };
    },
    sheetId,
  );
  return { data, people, sheets };
}
