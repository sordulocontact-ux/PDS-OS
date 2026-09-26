// Types of the team screen. Client-safe.

import type { FieldErrors, FormValues } from "@/lib/auth/form-state";

export type MemberActionState =
  | { status: "idle" }
  | {
      status: "error";
      error: string;
      fieldErrors?: FieldErrors;
      values?: FormValues;
    }
  | { status: "success" };

export const idleMemberActionState: MemberActionState = { status: "idle" };

// Value to show again after an error; otherwise the stored one.
export function retainedMemberValue(
  state: MemberActionState,
  field: string,
  fallback: string,
): string {
  return state.status === "error"
    ? (state.values?.[field] ?? fallback)
    : fallback;
}

export type MembershipStatus =
  "pending" | "approved" | "rejected" | "suspended";
export type MembershipRole = "admin" | "member";

export const MEMBERSHIP_STATUSES: readonly MembershipStatus[] = [
  "pending",
  "approved",
  "rejected",
  "suspended",
];

export type MembershipRow = {
  id: string;
  role: MembershipRole;
  status: MembershipStatus;
  requestedAt: string;
  decidedAt: string | null;
  decisionNote: string | null;
  person: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string | null;
  };
};

export function isMembershipStatus(value: unknown): value is MembershipStatus {
  return (
    typeof value === "string" &&
    (MEMBERSHIP_STATUSES as readonly string[]).includes(value)
  );
}
