import type { Member } from "@/lib/framing/related";
import {
  RECOMMENDATION_LEVELS,
  type RecommendationLevel,
} from "@/lib/strategy/recommendations";

// A recommendation applied or ignored (MKT-C2-02): what it said when it was
// settled, who settled it and when, and what became of it — the task as the
// Travail shows it, or the reason it was ignored.
export type SettledRecommendation = {
  id: string;
  ruleKey: string;
  state: "applied" | "ignored";
  level: RecommendationLevel | null;
  summary: string | null;
  reason: string | null;
  at: string;
  by: string | null;
  task: {
    id: string;
    title: string;
    done: boolean;
    dueOn: string | null;
    assignee: string | null;
  } | null;
};

type Row = {
  id: string;
  rule_key: string;
  state: string;
  level: string | null;
  summary: string | null;
  reason: string | null;
  created_at: string;
  created_by: string | null;
  tasks: {
    id: string;
    title: string;
    status: string;
    due_date: string | null;
    assignee_person_id: string;
  } | null;
};

export function settledRecommendations(
  rows: Row[],
  members: Member[],
): SettledRecommendation[] {
  const name = (id: string | null) =>
    members.find((m) => m.personId === id)?.name ?? null;
  return rows.map((s) => ({
    id: s.id,
    ruleKey: s.rule_key,
    state: s.state === "ignored" ? "ignored" : "applied",
    level:
      s.level && (RECOMMENDATION_LEVELS as readonly string[]).includes(s.level)
        ? (s.level as RecommendationLevel)
        : null,
    summary: s.summary,
    reason: s.reason,
    at: s.created_at,
    by: name(s.created_by),
    task: s.tasks && {
      id: s.tasks.id,
      title: s.tasks.title,
      done: s.tasks.status === "done",
      dueOn: s.tasks.due_date,
      assignee: name(s.tasks.assignee_person_id),
    },
  }));
}
