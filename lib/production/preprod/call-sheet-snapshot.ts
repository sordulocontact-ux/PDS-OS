// The call sheet as it is published (PROD-016): composed by code from what
// is validated — the shoot date, the place, the team with its contacts, the
// equipment booked — and the sheet's own sections; nothing is typed twice.
// What is still missing is listed before it is sent. Pure, client-safe.

import { fr } from "@/lib/i18n/fr";
import type {
  Holder,
  ProductionNeed,
  SheetLogistics,
} from "@/lib/production/sheet";

import { isConfirmedEquipment } from "./equipment";
import { teamMembers } from "./team";
import type { CallSheet, Equipment } from "./types";

export type CallSheetContent = {
  project: string;
  deliverable: string;
  manager: string | null;
  shootDate: string | null;
  callTime: string | null;
  location: {
    name: string | null;
    address: string | null;
    access: string | null;
  };
  team: {
    name: string;
    role: string;
    phone: string | null;
    email: string | null;
  }[];
  equipment: {
    label: string;
    quantity: number | null;
    supplier: string | null;
  }[];
  schedule: string | null;
  sequences: string | null;
  contactsNote: string | null;
  instructions: string | null;
  emergencies: string | null;
  documentsNote: string | null;
};

export type CallSheetGap =
  | "shootDate"
  | "location"
  | "callTime"
  | "team"
  | "availability"
  | "emergencies";

type Details = Record<string, { phone: string | null; email: string | null }>;

export function callSheetContent(input: {
  project: string;
  deliverable: string;
  manager: string | null;
  shootDate: string | null;
  logistics: SheetLogistics;
  director: Holder | null;
  needs: ProductionNeed[];
  equipment: Equipment[];
  callSheet: CallSheet | null;
  details: Details;
}): CallSheetContent {
  const contact = (h: Holder) =>
    h.kind === "contact"
      ? {
          phone: input.details[h.id]?.phone ?? null,
          email: input.details[h.id]?.email ?? null,
        }
      : { phone: null, email: null };
  const team = [
    ...(input.director
      ? [
          {
            holder: input.director,
            role: fr.productionPreprod.call.directorRole,
          },
        ]
      : []),
    ...teamMembers(input.needs),
  ].map((m) => ({ name: m.holder.name, role: m.role, ...contact(m.holder) }));
  const own = (key: keyof Omit<CallSheet, "updatedBy" | "updatedAt">) =>
    input.callSheet?.[key] ?? null;
  return {
    project: input.project,
    deliverable: input.deliverable,
    manager: input.manager,
    shootDate: input.shootDate,
    callTime: own("callTime"),
    location: {
      name: input.logistics.locationName,
      address: input.logistics.locationAddress,
      access: input.logistics.locationAccess,
    },
    team,
    equipment: input.equipment
      .filter((e) => isConfirmedEquipment(e) && e.status !== "returned")
      .map((e) => ({
        label: e.label,
        quantity: e.quantity,
        supplier: e.supplierName,
      })),
    schedule: own("schedule"),
    sequences: own("sequences"),
    contactsNote: own("contactsNote"),
    instructions: own("instructions"),
    emergencies: own("emergencies"),
    documentsNote: own("documentsNote"),
  };
}

/** What the team would miss: said before the sheet is published. */
export function callSheetGaps(
  content: CallSheetContent,
  input: { locationConfirmed: boolean; availabilityToConfirm: number },
): CallSheetGap[] {
  return [
    ...(!content.shootDate ? (["shootDate"] as const) : []),
    ...(!input.locationConfirmed ? (["location"] as const) : []),
    ...(!content.callTime ? (["callTime"] as const) : []),
    ...(content.team.length === 0 ? (["team"] as const) : []),
    ...(input.availabilityToConfirm > 0 ? (["availability"] as const) : []),
    ...(!content.emergencies ? (["emergencies"] as const) : []),
  ];
}

/** The same content, whatever the order of its keys (the database keeps
 * JSON with its own order). */
export function sameContent(a: unknown, b: unknown): boolean {
  const canonical = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(canonical)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.keys(v as Record<string, unknown>)
              .sort()
              .map((k) => [k, canonical((v as Record<string, unknown>)[k])]),
          )
        : v;
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}
