import "server-only";

import { assessFraming } from "@/lib/framing/assess";
import { framingCallTopics } from "@/lib/framing/call-prep";
import { loadFramingKnowledge } from "@/lib/framing/knowledge";

import type { PrepAdapter } from "./types";

/** The Cadrage's exchange: one point per dimension with something open. */
export const framingAdapter: PrepAdapter = {
  async points({ access, projectId }) {
    const k = await loadFramingKnowledge(projectId, access);
    if (!k) return { error: "not_found" };
    return {
      points: framingCallTopics(assessFraming(k)).map((x) => ({
        key: x.dimension,
        topic: x.topic,
        minutes: x.minutes,
        questions: x.questions,
        // Read back into the Cadrage once the call is processed (PROJ-UX-03).
        extra: { dimension: x.dimension },
      })),
    };
  },
  async create(supabase, a) {
    const { data, error } = await supabase.rpc("create_framing_call", {
      p_project_id: a.projectId,
      p_title: a.title,
      p_occurred_at: a.occurredAt,
      p_meeting_url: a.format === "video" ? a.meetingUrl : "",
      p_agenda: a.agenda,
      p_purpose: a.goal,
      p_participants: a.attendees.rows,
      p_document_ids: a.documentIds,
    });
    return { callId: data ?? null, error };
  },
};
