import "server-only";

import { loadBudget } from "@/lib/budget/queries";
import { strategyCallTopics } from "@/lib/strategy/call-prep";
import { loadStrategy } from "@/lib/strategy/queries";

import type { PrepAdapter } from "./types";

/** The Stratégie's exchange: one point per dimension still open. */
export const strategyAdapter: PrepAdapter = {
  async points({ access, projectId }) {
    const [data, budget] = await Promise.all([
      loadStrategy(projectId, access),
      loadBudget(projectId),
    ]);
    if (!data) return { error: "not_found" };
    return {
      points: strategyCallTopics({ ...data, budgetLines: budget.lines }).map(
        (x) => ({
          key: x.key,
          topic: x.topic,
          minutes: x.minutes,
          questions: x.questions,
        }),
      ),
    };
  },
  async create(supabase, a) {
    const { data, error } = await supabase.rpc("create_strategy_call", {
      p_project_id: a.projectId,
      p_title: a.title,
      p_occurred_at: a.occurredAt,
      p_meeting_url: a.format === "video" ? a.meetingUrl : "",
      p_agenda: a.agenda,
      p_purpose: a.goal,
      p_participants: a.attendees.rows,
      p_format: a.format,
    });
    return { callId: data ?? null, error };
  },
};
