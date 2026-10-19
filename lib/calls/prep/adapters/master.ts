import "server-only";

import { loadMasterBrief } from "@/lib/master-workflow/brief";
import { getProject } from "@/lib/projects/queries";

import type { PrepAdapter } from "./types";

/** The Master's exchange: what the Brief Mix/Master does not know yet. */
export const masterAdapter: PrepAdapter = {
  async points({ access, projectId }) {
    const project = await getProject(projectId);
    if (!project) return { error: "not_found" };
    const { nextAgenda } = await loadMasterBrief(project, access);
    return {
      points: nextAgenda.map((x, index) => ({
        key: `b${index + 1}`,
        topic: x.topic,
        minutes: x.minutes,
        questions: x.questions ?? [],
      })),
    };
  },
  async create(supabase, a) {
    const { data, error } = await supabase.rpc("create_master_exchange", {
      p_project_id: a.projectId,
      p_title: a.title,
      p_occurred_at: a.occurredAt,
      p_meeting_url: a.format === "video" ? a.meetingUrl : "",
      p_agenda: a.agenda,
    });
    return { callId: data ?? null, error };
  },
};
