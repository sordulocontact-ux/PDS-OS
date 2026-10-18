import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Access } from "@/lib/auth/access";
import type { StoredPoint, PreparedPoint } from "@/lib/calls/prepare-schema";
import type { ResolvedAttendees } from "@/lib/calls/prep/people";
import type { PrepFormat } from "@/lib/calls/prep/types";
import type { Database } from "@/lib/supabase/database.types";

export type Client = SupabaseClient<Database>;

/** What every kind receives once the form is checked. */
export type CreateArgs = {
  projectId: string;
  target: Record<string, string>;
  title: string;
  occurredAt: string;
  format: PrepFormat;
  meetingUrl: string;
  goal: string;
  agenda: StoredPoint[];
  attendees: ResolvedAttendees;
  documentIds: string[];
  extraIds: string[];
};

/**
 * One kind of prepared call: the points PO prepared, recomputed on the
 * server from the module's data (never sent by the browser), then the SQL
 * function of the module that writes the call and its link table.
 */
export type PrepAdapter = {
  points: (input: {
    access: Access;
    projectId: string;
    target: Record<string, string>;
    extraIds: string[];
  }) => Promise<
    { points: PreparedPoint[]; extraIds?: string[] } | { error: string }
  >;
  create: (
    supabase: Client,
    args: CreateArgs,
  ) => Promise<{
    callId: string | null;
    error: { code?: string; message: string } | null;
  }>;
  // A refusal of the module's SQL function, in French.
  failure?: (error: { code?: string; message: string }) => string | null;
};
