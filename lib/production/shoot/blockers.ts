// What the shoot leaves open (ticket, parcours 11 to 13 and its edge cases):
// what the postproduction's preparation waits for, and what the
// administrative closing waits for. Computed by code from what people
// declared, never by PO. Client-safe.

import {
  DECLARATIONS,
  isReturnPending,
  isShootEnded,
  type DeclarationKey,
  type ReturnLine,
  type ShootIncident,
  type ShootRecord,
} from "@/lib/production/shoot/rules";

export type PostBlocker =
  | { kind: "declaration"; key: DeclarationKey }
  | { kind: "incident"; title: string };

/** Once the shoot ended: a missing declaration (video rushes, audio sources,
 * backup) and every open incident a person said blocks the postproduction.
 * An incident nobody marked as blocking never blocks. */
export function postBlockers(
  shoot: ShootRecord,
  incidents: ShootIncident[],
): PostBlocker[] {
  if (!isShootEnded(shoot.state)) return [];
  return [
    ...DECLARATIONS.filter((key) => !shoot.declarations[key].done).map(
      (key) => ({ kind: "declaration" as const, key }),
    ),
    ...incidents
      .filter((i) => i.blocksPost && i.resolvedAt === null)
      .map((i) => ({ kind: "incident" as const, title: i.title })),
  ];
}

export type ClosingBlocker =
  { kind: "not_returned"; count: number } | { kind: "incident"; title: string };

/** The administrative closing waits for the equipment still out and for
 * every open incident marked as blocking it. A return incident is not a
 * blocker by itself: reported as a shoot incident, a person decides. */
export function closingBlockers(
  equipment: ReturnLine[],
  incidents: ShootIncident[],
): ClosingBlocker[] {
  const notReturned = equipment.filter(isReturnPending).length;
  return [
    ...(notReturned > 0
      ? [{ kind: "not_returned" as const, count: notReturned }]
      : []),
    ...incidents
      .filter((i) => i.blocksClosing && i.resolvedAt === null)
      .map((i) => ({ kind: "incident" as const, title: i.title })),
  ];
}
