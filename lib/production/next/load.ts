import "server-only";

import type { Access } from "@/lib/auth/access";
import { todayInParis } from "@/lib/insights/dates";
import {
  checkSince,
  decisionsOf,
  handoffStaleness,
  summarize,
} from "@/lib/production/delivery/rules";
import { effectiveLogistics } from "@/lib/production/logistics";
import type { ProductionPhase } from "@/lib/production/phase";
import { stepLabel } from "@/lib/production/post/labels";
import { isPendingCorrection } from "@/lib/production/post/rules";
import { isConfirmedEquipment } from "@/lib/production/preprod/equipment";
import { preprodOverview } from "@/lib/production/preprod/overview";
import type { CheckKey } from "@/lib/production/preprod/types";
import type { ProductionSheetData } from "@/lib/production/sheet";
import { retroSchedule } from "@/lib/production/preprod/schedule";
import { postBlockers } from "@/lib/production/shoot/blockers";
import {
  deliveryFor,
  postFor,
  preprodFor,
  shootFor,
} from "@/lib/production/tab-data";

import { productionNext } from "./compute";
import type { NextInput, ProductionNext } from "./types";

type Phase = ProductionPhase;
const PREPARING: Phase[] = ["to_prepare", "preproduction"];
const AFTER_SHOOT: Phase[] = ["ready", "shot"];
const POST: Phase[] = ["post", "final_check"];
const DELIVERY: Phase[] = ["final_check", "delivered", "handed_off"];

/**
 * The next action of one sheet (PROD-001), read with the user's session.
 * Only the data of the phase reached is read; the tab shown shares it
 * (lib/production/tab-data.ts).
 */
export async function loadProductionNext(
  projectId: string,
  deliverableId: string,
  access: Access,
  data: ProductionSheetData,
  phase: Phase,
): Promise<ProductionNext> {
  const sheet = data.sheet;
  const args = [projectId, deliverableId, access] as const;
  const [preprod, shoot, post, delivery] = await Promise.all([
    sheet && PREPARING.includes(phase) ? preprodFor(...args) : null,
    sheet && AFTER_SHOOT.includes(phase) ? shootFor(...args) : null,
    sheet && POST.includes(phase) ? postFor(...args) : null,
    sheet && DELIVERY.includes(phase) ? deliveryFor(...args) : null,
  ]);
  const ownerIsViewer = data.canOpen || data.canOrganize;
  const today = todayInParis();
  // The backward schedule's dates (nothing is « done » here: only dates).
  const due: NextInput["due"] = {};
  if (sheet)
    for (const row of retroSchedule(
      effectiveLogistics(sheet.logistics, data.heritage.fiche),
      {},
      today,
    ).rows)
      if (row.date) due[row.step] = row.end ?? row.date;

  const input: NextInput = {
    projectId,
    due,
    deliverableId,
    phase,
    stageState: data.stageState,
    hasSource: data.heritage.fiche !== null || data.heritage.source !== null,
    canOpen: data.canOpen,
    owner: { name: data.ownerName, isViewer: ownerIsViewer },
    sheet: sheet
      ? {
          director: sheet.director
            ? {
                name: sheet.director.name,
                isMember: sheet.director.kind === "person",
                isViewer:
                  sheet.director.kind === "person" &&
                  sheet.director.id === access.personId,
              }
            : null,
          briefWritten: Boolean(sheet.brief.stagingIntent?.trim()),
        }
      : null,
    preprod: null,
    shoot: shoot
      ? {
          state: shoot.shoot.state,
          postBlockers: postBlockers(shoot.shoot, shoot.incidents),
        }
      : null,
    post: null,
    delivery: null,
  };

  if (preprod && sheet) {
    const o = preprodOverview(data, preprod, today);
    const { positions, filled, toConfirm } = o.staffing;
    const workDone: Record<CheckKey, boolean> = {
      location: sheet.logistics.locationStatus === "confirmed",
      team: positions > 0 && filled === positions && toConfirm === 0,
      equipment:
        preprod.equipment.length > 0 &&
        preprod.equipment.every(isConfirmedEquipment),
      schedule:
        o.logistics.shootDate.value !== null &&
        o.schedule.rows.every((r) => !r.late),
      budget:
        o.budget.envelopeCents !== null &&
        !o.budget.over &&
        o.budget.byStatus.to_decide.count === 0,
      call_sheet: Boolean(preprod.callSheet?.callTime),
      permits: false,
    };
    input.preprod = {
      hasTechnicalCall: preprod.calls.length > 0 || preprod.items.length > 0,
      callProposals: preprod.items.filter((i) => i.status === "proposed")
        .length,
      unplannedActions: preprod.items.filter(
        (i) =>
          i.kind === "action" &&
          i.status === "confirmed" &&
          !preprod.actions.some(
            (a) => a.itemId === i.id && a.status === "approved",
          ),
      ).length,
      equipmentCount: preprod.equipment.length,
      staffing: o.staffing,
      checks: o.checks.map((c) => ({
        key: c.key,
        state: c.state,
        workDone: workDone[c.key],
      })),
    };
  }

  if (post) {
    const latest = post.versions[0];
    const maker =
      post.steps.find((s) => s.key === "edit" && s.holder) ??
      post.steps.find((s) => s.holder);
    input.post = {
      viewerReviews: post.canReview,
      steps: post.steps.map((s) => ({
        label: stepLabel(s),
        holder: s.holder?.name ?? null,
      })),
      maker: maker?.holder?.name ?? null,
      makerNeedsLink:
        maker?.holder?.kind === "contact" &&
        !post.providerLinks[maker.holder.id],
      versions: post.versions.map((v) => ({
        number: v.number,
        status: v.status,
        requestDraft: v.request?.status === "draft",
      })),
      pendingCorrections: latest
        ? latest.comments.filter((c) => isPendingCorrection(c.status)).length
        : 0,
    };
  }

  if (delivery) {
    const since = checkSince(delivery.delivery);
    const summary = summarize(delivery.lines, since);
    const latest = delivery.handoffs[0];
    input.delivery = {
      decisions: decisionsOf({
        approvedAt: delivery.delivery?.approvedAt ?? null,
        checkedAt: delivery.delivery?.checkedAt ?? null,
        deliveredAt: delivery.delivery?.deliveredAt ?? null,
        summary,
      }),
      summary,
      approvedVersion: delivery.version?.number ?? null,
      handoffStale: latest
        ? handoffStaleness(latest, delivery.delivery) !== null
        : false,
    };
  }

  return productionNext(input);
}
