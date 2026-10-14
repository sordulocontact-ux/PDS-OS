// Types of the team screen. Client-safe.

import type { FieldErrors, FormValues } from "@/lib/auth/form-state";
import type { OrganizationRole } from "@/lib/auth/redirects";

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
  "invited" | "pending" | "approved" | "rejected" | "suspended";
export type MembershipRole = OrganizationRole;

export const MEMBERSHIP_STATUSES: readonly MembershipStatus[] = [
  "pending",
  "approved",
  "invited",
  "rejected",
  "suspended",
];

export type MembershipRow = {
  id: string;
  // Null until the director chooses it (self-signup waiting for approval).
  role: MembershipRole | null;
  status: MembershipStatus;
  requestedAt: string;
  decidedAt: string | null;
  decisionNote: string | null;
  // Requests to PO (the language model) today and the daily limit.
  ai: { used: number; limit: number };
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

// Result of the account creation screen. ready: the account can log in now
// (email confirmation off); otherwise the person confirms their address.
export type InviteState =
  | { status: "idle" }
  | {
      status: "error";
      error?: string;
      fieldErrors?: FieldErrors;
      values?: FormValues;
    }
  | {
      status: "success";
      firstName: string;
      email: string;
      ready: boolean;
      link: string;
    };

export const idleInviteState: InviteState = { status: "idle" };
