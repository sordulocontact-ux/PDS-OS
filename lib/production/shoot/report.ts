// The shoot report (ticket, parcours 13): the state, observations, rushes,
// backup, incidents, equipment and deviations put together by code from
// what people recorded. It never claims to have checked a file: the
// declarations stay declarations. Client-safe.

import {
  closingBlockers,
  postBlockers,
  type ClosingBlocker,
  type PostBlocker,
} from "@/lib/production/shoot/blockers";
import {
  DECLARATIONS,
  isShootEnded,
  returnStateOf,
  type ReturnLine,
  type ReturnState,
  type ShootIncident,
  type ShootRecord,
} from "@/lib/production/shoot/rules";

export type ShootReport = {
  ended: boolean;
  validated: boolean;
  // The owner validates once the shoot ended and while it is not validated.
  canValidate: boolean;
  declarationsDone: number;
  declarationsTotal: number;
  incidentsOpen: number;
  incidentsResolved: number;
  returnState: ReturnState;
  equipmentTotal: number;
  equipmentReturned: number;
  postBlockers: PostBlocker[];
  closingBlockers: ClosingBlocker[];
};

export function shootReport(
  shoot: ShootRecord,
  incidents: ShootIncident[],
  equipment: ReturnLine[],
): ShootReport {
  const ended = isShootEnded(shoot.state);
  const validated = shoot.reportValidatedAt !== null;
  const resolved = incidents.filter((i) => i.resolvedAt !== null).length;
  return {
    ended,
    validated,
    canValidate: ended && !validated,
    declarationsDone: DECLARATIONS.filter((k) => shoot.declarations[k].done)
      .length,
    declarationsTotal: DECLARATIONS.length,
    incidentsOpen: incidents.length - resolved,
    incidentsResolved: resolved,
    returnState: returnStateOf(equipment),
    equipmentTotal: equipment.length,
    equipmentReturned: equipment.filter((l) => l.status === "returned").length,
    postBlockers: postBlockers(shoot, incidents),
    closingBlockers: closingBlockers(equipment, incidents),
  };
}
