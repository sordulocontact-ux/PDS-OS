import "server-only";

import { designCallTopics } from "@/lib/design/call-prep";
import {
  designCallContext,
  designCallTargets,
} from "@/lib/design/call-sheet-data";
import { loadConception } from "@/lib/design/conception";
import { getProject } from "@/lib/projects/queries";

import type { PrepAdapter } from "./types";

/**
 * The Conception's creative exchange: points from what the chosen
 * deliverables lack. Only deliverables of this Conception are kept.
 */
export const designAdapter: PrepAdapter = {
  async points({ access, projectId, extraIds }) {
    const project = await getProject(projectId);
    const data = project ? await loadConception(project, access) : null;
    if (!project || !data) return { error: "not_found" };
    const known = new Set(data.deliverables.map((d) => d.id));
    const ids = extraIds.filter((id) => known.has(id));
    const context = await designCallContext(projectId);
    return {
      extraIds: ids,
      points: designCallTopics(
        { ...designCallTargets(data), context },
        ids,
      ).map((x) => ({
        key: x.key,
        topic: x.topic,
        minutes: x.minutes,
        questions: x.questions,
      })),
    };
  },
  async create(supabase, a) {
    const { data, error } = await supabase.rpc("create_design_call", {
      p_project_id: a.projectId,
      p_title: a.title,
      p_occurred_at: a.occurredAt,
      p_meeting_url: a.format === "video" ? a.meetingUrl : "",
      p_agenda: a.agenda,
      p_purpose: a.goal,
      p_participants: a.attendees.rows,
      p_format: a.format,
      p_deliverable_ids: a.extraIds,
    });
    return { callId: data ?? null, error };
  },
};
