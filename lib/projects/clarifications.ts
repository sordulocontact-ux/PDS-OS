// Requests for clarification of a project's transmission, structured
// (PROJ-UX-02): who asked, when, about what, the question, the director's
// reply, and whether it was answered. Paired by code: a request is the
// project manager's answer to a transmission, its reply the note of the
// next transmission. Words the viewer may not read stay null (RLS,
// project_assignment_messages). Client-safe.

import type { Assignment, ClarificationSubject } from "@/lib/projects/types";

export type Clarification = {
  id: string;
  author: string;
  askedAt: string | null;
  subject: ClarificationSubject | null;
  question: string | null;
  answer: string | null;
  answeredBy: string | null;
  answeredAt: string | null;
  status: "answered" | "waiting" | "retransmitted";
};

/** Oldest first, from the transmissions (newest first, as loaded). */
export function clarificationsOf(assignments: Assignment[]): Clarification[] {
  const ordered = [...assignments].reverse();
  return ordered.flatMap((a, index): Clarification[] => {
    if (a.status !== "clarification_requested") return [];
    const reply = ordered[index + 1] ?? null;
    return [
      {
        id: a.id,
        author: a.assigneeName,
        askedAt: a.respondedAt,
        subject: a.subject,
        question: a.response,
        answer: reply?.note ?? null,
        answeredBy: reply?.assignedByName ?? null,
        answeredAt: reply?.createdAt ?? null,
        status: !reply ? "waiting" : reply.note ? "answered" : "retransmitted",
      },
    ];
  });
}
