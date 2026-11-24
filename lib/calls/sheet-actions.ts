"use server";

import { z } from "zod";

import { routes } from "@/lib/auth/redirects";
import { requireApproved } from "@/lib/auth/dal";
import type { CallSheetData } from "@/lib/calls/sheet-types";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// A call's side sheet (CallSheet), read when it opens: its team, its
// guests and its latest report's summary, with the viewer's session (RLS:
// can_see_call).

/** null: the call is gone or out of reach. */
export async function loadCallSheet(
  callId: string,
): Promise<CallSheetData | null> {
  await requireApproved();
  if (!z.uuid().safeParse(callId).success) return null;
  const supabase = await createClient();
  const [call, attendees, guests, reports] = await Promise.all([
    supabase.from("calls").select("id").eq("id", callId).maybeSingle(),
    supabase
      .from("call_attendees")
      .select(
        "person_id, person:people!call_attendees_person_id_fkey(first_name, last_name)",
      )
      .eq("call_id", callId),
    supabase
      .from("call_guests")
      .select("email, name, contact_id")
      .eq("call_id", callId),
    supabase
      .from("call_reports")
      .select("summary, created_at")
      .eq("call_id", callId)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);
  if (!call.data) return null;
  return {
    team: (attendees.data ?? []).flatMap((row) =>
      row.person
        ? [
            {
              id: row.person_id,
              name: personName(row.person.first_name, row.person.last_name),
            },
          ]
        : [],
    ),
    guests: (guests.data ?? []).map((guest) => ({
      id: guest.contact_id ?? guest.email,
      name: guest.name ?? guest.email,
      href: guest.contact_id
        ? routes.networkContact(guest.contact_id)
        : undefined,
      detail: guest.name ? guest.email : null,
    })),
    summary: reports.data?.[0]?.summary ?? null,
  };
}
