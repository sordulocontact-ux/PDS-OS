import { ContractGapsCallout } from "@/components/legal/contract-gaps-notice";
import { can, type Access } from "@/lib/auth/access";
import { loadContractGaps, type ContractGap } from "@/lib/legal/contract-gaps";
import type { StudioSession } from "@/lib/sessions/types";
import { createClient } from "@/lib/supabase/server";

/**
 * A studio session of a collective (lot 12 bis, décision 6): the
 * participation contracts still not signed, said while recording, never
 * blocking. Per collective project of the session; when the session names
 * titles of that project, only theirs. Nothing for any other project
 * (list_contract_gaps answers empty).
 */
export async function SessionContractWarnings({
  session,
  access,
}: {
  session: StudioSession;
  access: Access;
}) {
  if (session.projects.length === 0) return null;
  const supabase = await createClient();
  const masterIds = new Set(session.titles.map((t) => t.id));
  const [titles, ...gaps] = await Promise.all([
    supabase
      .from("project_titles")
      .select("id, project_id, master_id")
      .in(
        "project_id",
        session.projects.map((p) => p.id),
      ),
    ...session.projects.map((p) =>
      Promise.all([
        loadContractGaps(p.id, "shoot"),
        loadContractGaps(p.id, "release"),
      ]),
    ),
  ]);
  if (titles.error)
    console.error("SessionContractWarnings:", titles.error.message);
  const rows = titles.data ?? [];
  // The project's titles this session records, by their project title.
  const recorded = (projectId: string) =>
    new Set(
      rows
        .filter(
          (r) =>
            r.project_id === projectId &&
            r.master_id !== null &&
            masterIds.has(r.master_id),
        )
        .map((r) => r.id),
    );
  const shown = session.projects.flatMap((project, i) => {
    const [shoot, release] = gaps[i];
    const mine = recorded(project.id);
    const only = (list: ContractGap[]) =>
      mine.size > 0 ? list.filter((g) => mine.has(g.titleId)) : list;
    const s = only(shoot);
    const r = only(release);
    return s.length || r.length ? [{ project, shoot: s, release: r }] : [];
  });
  if (shown.length === 0) return null;
  return (
    <div className="flex flex-col gap-4">
      {shown.map(({ project, shoot, release }) => (
        <ContractGapsCallout
          key={project.id}
          projectId={project.id}
          shoot={shoot}
          release={release}
          canOpenLegal={can(access, "manage_legal")}
          projectTitle={project.name}
        />
      ))}
    </div>
  );
}
