import { foldName } from "@/lib/assistant/fuzzy-name";
import type { GuideTopic } from "@/lib/assistant/guide/types";
import { adminTopics } from "@/lib/assistant/guide/topics/admin";
import { dailyTopics } from "@/lib/assistant/guide/topics/daily";
import { libraryTopics } from "@/lib/assistant/guide/topics/library";
import { libraryFilesTopics } from "@/lib/assistant/guide/topics/library-files";
import { marketingTopics } from "@/lib/assistant/guide/topics/marketing";
import { poTopics } from "@/lib/assistant/guide/topics/po";
import { projectPilotTopics } from "@/lib/assistant/guide/topics/project-pilot";
import { projectsTopics } from "@/lib/assistant/guide/topics/projects";
import { workflowsTopics } from "@/lib/assistant/guide/topics/workflows";

/**
 * Every topic of PO's guide, written by the team (docs/ASSISTANT.md
 * § 3 quater), and the pure code around them: the map in the prompt and
 * the lookup by key or words. No database, no screen: testable alone.
 */
export const GUIDE_TOPICS: readonly GuideTopic[] = [
  ...poTopics,
  ...dailyTopics,
  ...projectsTopics,
  ...projectPilotTopics,
  ...workflowsTopics,
  ...marketingTopics,
  ...libraryTopics,
  ...libraryFilesTopics,
  ...adminTopics,
];

/** The map in PO's cached prompt: every topic, one line, its key. */
export function guideMap(): string {
  return GUIDE_TOPICS.map((t) => `- ${t.title} (${t.key}) : ${t.summary}`).join(
    "\n",
  );
}

const tokensOf = (text: string) =>
  foldName(text)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

/**
 * Whole words only: « po » must not match « pourquoi ». A keyword matches
 * as a phrase of the question (2), or a long question word starts it
 * (« contrat » for « contrats ») or it starts a long question word (1).
 */
function matches(keyword: string, tokens: string[], line: string): number {
  const k = tokensOf(keyword).join(" ");
  if (!k) return 0;
  // A phrase said as is weighs more than a shared beginning.
  if (line.includes(` ${k} `)) return 2;
  if (k.includes(" ")) return 0;
  return tokens.some(
    (w) =>
      (w.length >= 4 && k.startsWith(w)) || (k.length >= 4 && w.startsWith(k)),
  )
    ? 1
    : 0;
}

/** Topics for a key or a few words: the key first, then the best two. */
export function findTopics(subject: string): GuideTopic[] {
  const key = subject.trim().toLowerCase();
  const exact = GUIDE_TOPICS.find((t) => t.key === key);
  if (exact) return [exact];
  const tokens = tokensOf(subject);
  const line = ` ${tokens.join(" ")} `;
  const scored = GUIDE_TOPICS.map((topic) => ({
    topic,
    score:
      2 * matches(topic.title, tokens, line) +
      topic.keywords.reduce((sum, k) => sum + matches(k, tokens, line), 0),
  })).filter((s) => s.score > 0);
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((s) => s.topic);
}
