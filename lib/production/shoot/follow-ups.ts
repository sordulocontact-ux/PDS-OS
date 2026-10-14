// The follow-ups PO proposes after the shoot (ticket, parcours 12 and 13):
// a task per open point, never created without a person choosing who and
// when. Which points exist is decided by code from the record; a proposal
// already turned into an open task (same title) is not proposed again.
// Client-safe.

import { fr } from "@/lib/i18n/fr";
import { formatDate } from "@/lib/release/format";
import {
  isReturnOverdue,
  isReturnPending,
  isShootEnded,
  needsMissingSequences,
  type ReturnLine,
  type ShootIncident,
  type ShootRecord,
} from "@/lib/production/shoot/rules";

const t = fr.productionShoot.followUps;

export type FollowUp = {
  key: string;
  title: string;
  reason: string;
  // Pre-filled, changed by the person before creating: the member who holds
  // the point (return, incident), and the return's due date.
  assigneePersonId: string | null;
  dueDate: string | null;
};

export function proposedFollowUps({
  deliverableTitle,
  shoot,
  incidents,
  equipment,
  openTaskTitles,
  today,
  directorPersonId = null,
}: {
  deliverableTitle: string;
  // The sheet's director when a member: who a retake goes to (PROD-003).
  directorPersonId?: string | null;
  shoot: ShootRecord;
  incidents: ShootIncident[];
  equipment: ReturnLine[];
  openTaskTitles: string[];
  today: string;
}): FollowUp[] {
  const ended = isShootEnded(shoot.state);
  const memberOf = (holder: ShootIncident["holder"]) =>
    holder?.kind === "person" ? holder.id : null;
  const proposals: FollowUp[] = [];

  if (ended)
    for (const key of [
      "video_rushes",
      "audio_sources",
      "backup_verified",
    ] as const)
      if (!shoot.declarations[key].done)
        proposals.push({
          key,
          title: t.proposals[key](deliverableTitle),
          reason: t.reasons[key],
          // Who the shoot named for the rushes or the backup.
          assigneePersonId: memberOf(
            key === "backup_verified" ? shoot.backupHolder : shoot.rushesHolder,
          ),
          dueDate: null,
        });

  if (needsMissingSequences(shoot.state))
    proposals.push({
      key: "retake",
      title: t.proposals.retake(deliverableTitle),
      reason: t.reasons.retake,
      assigneePersonId: directorPersonId,
      dueDate: null,
    });

  for (const incident of incidents)
    if (incident.resolvedAt === null)
      proposals.push({
        key: `incident:${incident.id}`,
        title: t.proposals.incident(incident.title),
        reason: t.reasons.incident,
        assigneePersonId: memberOf(incident.holder),
        dueDate: null,
      });

  for (const line of equipment) {
    const due = line.returnDue;
    const dueReached = due !== null && due <= today;
    if (!isReturnPending(line) || !(ended || dueReached)) continue;
    proposals.push({
      key: `equipment:${line.id}`,
      title: t.proposals.equipment(line.label),
      reason:
        due === null
          ? t.reasons.equipmentNoDue
          : isReturnOverdue(line, today)
            ? t.reasons.equipmentOverdue(formatDate(due))
            : t.reasons.equipmentDue(formatDate(due)),
      assigneePersonId: memberOf(line.holder),
      dueDate: due,
    });
  }

  const taken = new Set(openTaskTitles);
  return proposals.filter((p) => !taken.has(p.title));
}
