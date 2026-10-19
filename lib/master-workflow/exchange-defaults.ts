import "server-only";

import { callPrepDefaults } from "@/lib/calls/prep/defaults";
import type { CallPrepDefaults } from "@/lib/calls/prep/types";
import { fr } from "@/lib/i18n/fr";
import type { BriefView } from "@/lib/master-workflow/brief-types";

/**
 * The common call form of the Master's Brief: what the brief does not know
 * yet as the agenda, the owner and the mix engineer already chosen.
 */
export function masterExchangeDefaults(
  view: BriefView,
  ownerId: string | null,
): Promise<CallPrepDefaults> {
  const t = fr.callPrep.kinds.master;
  return callPrepDefaults({
    kind: "master",
    projectId: view.projectId,
    noun: "exchange",
    title: t.title,
    points: view.nextAgenda.map((x, index) => ({
      key: `b${index + 1}`,
      topic: x.topic,
      minutes: x.minutes,
      questions: x.questions ?? [],
    })),
    proposal: {
      // The owner and who validates the versions (proto `mxPrep`).
      personIds: [
        ...new Set(
          [ownerId, view.brief.validatorPersonId].filter((id): id is string =>
            Boolean(id),
          ),
        ),
      ],
      contactIds: view.brief.mixContactId ? [view.brief.mixContactId] : [],
    },
    goal: t.goal,
    note: t.note,
  });
}
