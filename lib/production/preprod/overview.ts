// Préproduction: everything the tab computes once from the sheet and its
// rows — states, counts, schedule, totals, the evidence shown next to each
// check — so the summary, the sections and the readiness agree. Code only
// (rule 6). Client-safe.

import { fr } from "@/lib/i18n/fr";
import {
  effectiveLogistics,
  type EffectiveLogistics,
} from "@/lib/production/logistics";
import type { ProductionSheetData } from "@/lib/production/sheet";

import { preprodBudgetTotals, type PreprodBudgetTotals } from "./budget";
import {
  equipmentCounts,
  isConfirmedEquipment,
  type EquipmentCounts,
} from "./equipment";
import {
  actionStates,
  planState,
  type ActionState,
  type PlanState,
} from "./plan";
import { checkRows, type CheckRow } from "./readiness";
import {
  retroSchedule,
  type ScheduleRow,
  type ScheduleWarning,
} from "./schedule";
import { multiRolePeople, staffingCounts, type StaffingCounts } from "./team";
import {
  TEAMS,
  teamBriefContent,
  teamBriefState,
  type Team,
  type TeamBriefContent,
  type TeamBriefState,
} from "./team-briefs";
import { CALL_SHEET_FIELDS, type CheckKey, type PreprodData } from "./types";

export type BriefView = {
  team: Team;
  content: TeamBriefContent;
  state: TeamBriefState;
};

export type PreprodOverview = {
  logistics: EffectiveLogistics;
  briefs: BriefView[];
  staffing: StaffingCounts;
  multiRole: { name: string; roles: string[] }[];
  equipment: EquipmentCounts;
  schedule: { rows: ScheduleRow[]; warnings: ScheduleWarning[] };
  budget: PreprodBudgetTotals;
  actionStates: Map<string, ActionState>;
  planState: PlanState;
  callSheetFilled: number;
  checks: CheckRow[];
  evidence: Record<CheckKey, string>;
};

export function preprodOverview(
  data: Pick<ProductionSheetData, "heritage" | "sheet" | "needs">,
  preprod: PreprodData,
  today: string,
): PreprodOverview {
  const t = fr.productionPreprod.readiness.evidence;
  const logistics = effectiveLogistics(
    data.sheet?.logistics ?? null,
    data.heritage.fiche,
  );
  const staffing = staffingCounts(data.needs);
  const multiRole = multiRolePeople(data.needs);
  const equipment = equipmentCounts(preprod.equipment, today);
  const budget = preprodBudgetTotals(
    preprod.budget,
    logistics.budgetEnvelopeCents.value,
  );
  const locationStatus = data.sheet?.logistics.locationStatus ?? "to_find";
  const callSheetFilled = preprod.callSheet
    ? CALL_SHEET_FIELDS.filter((f) => preprod.callSheet?.[f]).length
    : 0;
  const checks = checkRows(preprod.checks);
  const checked = (key: CheckKey) =>
    checks.find((c) => c.key === key)?.state === "confirmed";

  const briefs = TEAMS.map((team) => {
    const row = preprod.briefs.find((b) => b.team === team);
    const content = teamBriefContent(team, data, row?.fields ?? {});
    return {
      team,
      content,
      state: teamBriefState(content, row?.snapshot ?? null),
    };
  });

  const schedule = retroSchedule(
    logistics,
    {
      brief: briefs.find((b) => b.team === "director")?.state === "transmitted",
      location: locationStatus === "confirmed",
      team:
        staffing.positions > 0 &&
        staffing.filled === staffing.positions &&
        staffing.toConfirm === 0,
      estimates:
        preprod.budget.length > 0 && budget.byStatus.to_estimate.count === 0,
      rental:
        preprod.equipment.length > 0 &&
        preprod.equipment.every(isConfirmedEquipment),
      call_sheet: checked("call_sheet"),
    },
    today,
  );
  const late = schedule.rows.filter((r) => r.late).length;
  const states = actionStates(preprod.actions);

  return {
    logistics,
    briefs,
    staffing,
    multiRole,
    equipment,
    schedule,
    budget,
    actionStates: states,
    planState: planState(preprod.actions, states),
    callSheetFilled,
    checks,
    evidence: {
      location: t.location[locationStatus],
      team: [
        t.team(staffing.filled, staffing.positions, staffing.toConfirm),
        multiRole.length ? t.multiRole(multiRole.length) : null,
      ]
        .filter(Boolean)
        .join(" · "),
      equipment: t.equipment(equipment.confirmed, equipment.toVerify),
      schedule: !logistics.shootDate.value
        ? t.schedule.none
        : late
          ? t.schedule.late(late)
          : t.schedule.ok,
      budget:
        budget.envelopeCents === null
          ? t.budget.noEnvelope
          : budget.over
            ? t.budget.over
            : budget.byStatus.to_decide.count
              ? t.budget.toDecide(budget.byStatus.to_decide.count)
              : t.budget.ok,
      call_sheet: t.callSheet(callSheetFilled, CALL_SHEET_FIELDS.length),
      permits: t.permits,
    },
  };
}
