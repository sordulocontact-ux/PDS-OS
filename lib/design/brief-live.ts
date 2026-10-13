import "server-only";

import type { Access } from "@/lib/auth/access";
import {
  buildCreativeBrief,
  type CreativeBriefContent,
} from "@/lib/design/brief";
import { briefChecks, type BriefChecks } from "@/lib/design/brief-checks";
import { loadConception, type ConceptionData } from "@/lib/design/conception";
import { loadDirection } from "@/lib/design/direction";
import { loadSheetSummaries } from "@/lib/design/sheet-summaries";
import { loadMembers } from "@/lib/framing/related";
import { getProject } from "@/lib/projects/queries";

/**
 * The Brief créatif as the project stands now, with what it lacks
 * (MKT-C2-12): shared by « Créer la version », its page and its PDF, which
 * says whether a version is still up to date. Null when the project is
 * not readable.
 */
export async function liveCreativeBrief(
  projectId: string,
  access: Access,
): Promise<{
  title: string;
  data: ConceptionData;
  content: CreativeBriefContent;
  checks: BriefChecks;
} | null> {
  const project = await getProject(projectId);
  if (!project) return null;
  const [data, members, sheets] = await Promise.all([
    loadConception(project, access),
    loadMembers(access),
    loadSheetSummaries(projectId),
  ]);
  if (!data) return null;
  const direction = await loadDirection(projectId, members);
  // The direction is confirmed as a whole once its latest request is
  // approved (a withdrawn request counts as none).
  const latest = direction.submissions.find((s) => s.status !== "withdrawn");
  return {
    title: project.title,
    data,
    content: await buildCreativeBrief(project, data, direction),
    checks: briefChecks(data, latest?.status === "approved", sheets),
  };
}
