import "server-only";

import {
  reportContentOf,
  type ReportContent,
  type ReportScope,
  type Unreviewed,
} from "@/lib/calls/closure";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

export type CallClosure = {
  id: string;
  version: number;
  content: ReportContent;
  unreviewed: Unreviewed;
  note: string | null;
  closedAt: string;
  closedByName: string;
};

export type CallShare = {
  id: string;
  closureId: string;
  scope: ReportScope;
  recipients: string[];
  sharedAt: string;
  sharedByName: string;
};

const nameOf = (p: { first_name: string; last_name: string | null } | null) =>
  p ? personName(p.first_name, p.last_name) : "—";

const count = (value: unknown, key: string) => {
  const n =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)[key]
      : null;
  return typeof n === "number" ? n : 0;
};

/**
 * Every closed version of a call's report, newest first, and every share
 * of it: what the viewer may read (RLS: whoever sees the call, or a member
 * a version was shared with, who reads that one only).
 */
export async function loadCallClosures(callId: string): Promise<{
  closures: CallClosure[];
  shares: CallShare[];
}> {
  const supabase = await createClient();
  const [closures, shares] = await Promise.all([
    supabase
      .from("call_closures")
      .select(
        "id, version, content, unreviewed, note, closed_at, people:closed_by(first_name, last_name)",
      )
      .eq("call_id", callId)
      .order("version", { ascending: false }),
    supabase
      .from("call_report_shares")
      .select(
        "id, closure_id, scope, recipients, shared_at, people:shared_by(first_name, last_name)",
      )
      .eq("call_id", callId)
      .order("shared_at", { ascending: false }),
  ]);
  if (closures.error)
    console.error("loadCallClosures:", closures.error.message);
  if (shares.error)
    console.error("loadCallClosures shares:", shares.error.message);
  return {
    closures: (closures.data ?? []).flatMap((c) => {
      const content = reportContentOf(c.content);
      return content
        ? [
            {
              id: c.id,
              version: c.version,
              content,
              unreviewed: {
                actions: count(c.unreviewed, "actions"),
                proposals: count(c.unreviewed, "proposals"),
              },
              note: c.note,
              closedAt: c.closed_at,
              closedByName: nameOf(c.people),
            },
          ]
        : [];
    }),
    shares: (shares.data ?? []).map((s) => ({
      id: s.id,
      closureId: s.closure_id,
      scope: s.scope === "summary" ? "summary" : "full",
      recipients: Array.isArray(s.recipients)
        ? s.recipients.flatMap((r) =>
            r &&
            typeof r === "object" &&
            "name" in r &&
            typeof r.name === "string"
              ? [r.name]
              : [],
          )
        : [],
      sharedAt: s.shared_at,
      sharedByName: nameOf(s.people),
    })),
  };
}
