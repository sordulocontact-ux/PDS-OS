import "server-only";

import type { ProjectTitle } from "@/lib/projects/title-rules";
import { loadProjectTitles } from "@/lib/projects/titles";
import { loadTitleDeposits } from "@/lib/release/collective-releases";

type Query = Record<string, string | string[] | undefined>;

const one = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : null;

/**
 * The live title an entry of the Master, the Juridique or the Distribution
 * is asked to open on (lib/projects/title-carry-rules.ts): `titre=` names a
 * project title or its master (the Master's steps keep the master's id),
 * `sortie=` a release, whose title it is unless it is the compilation.
 * Null: none named, an abandoned title (out of every workflow, lot 9), or
 * the compilation — the entry then opens its list.
 */
export async function carriedTitle(
  projectId: string,
  query: Query,
): Promise<ProjectTitle | null> {
  const titre = one(query.titre);
  const sortie = one(query.sortie);
  if (!titre && !sortie) return null;
  const titles = (await loadProjectTitles(projectId)).filter(
    (title) => title.status !== "abandoned",
  );
  if (titre)
    return (
      titles.find(
        (title) => title.id === titre || title.master?.id === titre,
      ) ?? null
    );
  const deposits = await loadTitleDeposits(projectId);
  return (
    titles.find((title) => {
      const deposit = deposits[title.id];
      return (
        deposit && !deposit.withCompilation && deposit.releaseId === sortie
      );
    }) ?? null
  );
}
