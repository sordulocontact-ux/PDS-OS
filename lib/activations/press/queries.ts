import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";

import { createClient } from "@/lib/supabase/server";

export type OpportunityRecord = {
  id: string;
  targetId: string;
  originMessageId: string | null;
  type: string;
  format: string | null;
  subject: string | null;
  scheduledAt: string | null;
  timezone: string;
  location: string | null;
  participants: string | null;
  pdsPersonId: string | null;
  constraints: string | null;
  status: string;
  confirmedByName: string | null;
  confirmationChannel: string | null;
  confirmationProofUrl: string | null;
  confirmedAt: string | null;
  brief: string | null;
  statusNote: string | null;
};

/** A press activation's opportunities and interviews. Cached per request. */
export const loadOpportunities = trackedCache(
  async (activationId: string): Promise<OpportunityRecord[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("press_opportunities")
      .select("*")
      .eq("activation_id", activationId)
      .order("created_at");
    if (error) console.error("loadOpportunities:", error.message);
    return (data ?? []).map((o) => ({
      id: o.id,
      targetId: o.target_id,
      originMessageId: o.origin_message_id,
      type: o.type,
      format: o.format,
      subject: o.subject,
      scheduledAt: o.scheduled_at,
      timezone: o.timezone,
      location: o.location,
      participants: o.participants,
      pdsPersonId: o.pds_person_id,
      constraints: o.constraints_note,
      status: o.status,
      confirmedByName: o.confirmed_by_name,
      confirmationChannel: o.confirmation_channel,
      confirmationProofUrl: o.confirmation_proof_url,
      confirmedAt: o.confirmed_at,
      brief: o.brief,
      statusNote: o.status_note,
    }));
  },
);
