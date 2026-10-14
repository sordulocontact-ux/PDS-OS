import "server-only";

import { z } from "zod";

import { parseEurosToCents } from "@/lib/projects/schemas";

import { holderField, optionalDate, optionalText } from "./result";
import { EQUIPMENT_CATEGORIES, EQUIPMENT_SOURCES } from "./types";
import { EQUIPMENT_FORM_STATUSES } from "./equipment";

// What lib/production/preprod/actions-equipment.ts checks before writing:
// same limits as the database. Amounts arrive as typed (« 1 200,50 »).

const euros = z
  .string()
  .max(40)
  .transform((value, ctx) => {
    const cents = parseEurosToCents(value);
    if (cents === undefined) {
      ctx.addIssue({ code: "custom", message: "amount" });
      return z.NEVER;
    }
    return cents;
  });

const statuses = EQUIPMENT_FORM_STATUSES as readonly [string, ...string[]];

export const equipmentSchema = z
  .object({
    projectId: z.uuid(),
    category: z.enum(EQUIPMENT_CATEGORIES),
    label: z.string().trim().min(1).max(200),
    quantity: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : Number(v)))
      .refine(
        (v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 1000),
      ),
    supplierContactId: z
      .string()
      .transform((v) => (v === "" || v === "none" ? null : v))
      .refine((v) => v === null || z.uuid().safeParse(v).success),
    supplierName: optionalText(200),
    price: euros,
    periodStart: optionalDate,
    periodEnd: optionalDate,
    deposit: euros,
    returnTerms: optionalText(1000),
    status: z.enum(statuses),
    returnHolder: holderField,
    returnDue: optionalDate,
    incidentNote: optionalText(1000),
    note: optionalText(1000),
    source: z.enum(EQUIPMENT_SOURCES).default("rental"),
    receivedQuantity: z
      .string()
      .trim()
      .default("")
      .transform((v) => (v === "" ? null : Number(v)))
      .refine(
        (v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 1000),
      ),
    quoteFileId: z
      .string()
      .optional()
      .transform((v) => (v ? v : null))
      .refine((v) => v === null || z.uuid().safeParse(v).success),
  })
  .refine((e) => !e.periodStart || !e.periodEnd || e.periodStart <= e.periodEnd)
  .refine((e) => e.status !== "incident" || e.incidentNote !== null);

export type EquipmentInput = z.output<typeof equipmentSchema>;

/** The columns a person writes, from the checked input. */
export function equipmentRow(e: EquipmentInput) {
  return {
    category: e.category,
    label: e.label,
    quantity: e.quantity,
    supplier_contact_id: e.supplierContactId,
    supplier_name: e.supplierContactId ? null : e.supplierName,
    price_cents: e.price,
    period_start: e.periodStart,
    period_end: e.periodEnd,
    deposit_cents: e.deposit,
    return_terms: e.returnTerms,
    return_person_id: e.returnHolder.person,
    return_contact_id: e.returnHolder.contact,
    return_due: e.returnDue,
    incident_note: e.incidentNote,
    note: e.note,
    source: e.source,
    received_quantity: e.receivedQuantity,
  };
}
