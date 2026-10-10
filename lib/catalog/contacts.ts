// Artist contacts (manager, booker…). Client-safe.

import type { FieldErrors, FormValues } from "@/lib/auth/form-state";

export const CONTACT_ROLES = [
  "manager",
  "booker",
  "press",
  "legal",
  "other",
] as const;
export type ContactRole = (typeof CONTACT_ROLES)[number];

export type ArtistContact = {
  id: string;
  role: ContactRole;
  name: string;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
  // The person of the Réseau this contact is, when picked there.
  networkContactId: string | null;
};

export function isContactRole(value: unknown): value is ContactRole {
  return (
    typeof value === "string" &&
    (CONTACT_ROLES as readonly string[]).includes(value)
  );
}

// Primary contact first, then in the order they were added.
export function sortContacts(contacts: ArtistContact[]): ArtistContact[] {
  return [...contacts].sort(
    (a, b) => Number(b.isPrimary) - Number(a.isPrimary),
  );
}

export type ContactFormState =
  | { status: "idle" }
  | {
      status: "error";
      formError?: string;
      fieldErrors?: FieldErrors;
      values?: FormValues;
    }
  | { status: "saved" };

export const idleContactFormState: ContactFormState = { status: "idle" };
