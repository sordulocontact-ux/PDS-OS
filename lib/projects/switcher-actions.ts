"use server";

import { requireApproved } from "@/lib/auth/dal";
import { listProjects } from "@/lib/projects/queries";

export type SwitcherProject = {
  id: string;
  title: string;
  artistName: string;
  // Launched projects have sections: switching keeps the open one.
  launched: boolean;
};

// The projects of the switcher at the top of a project's sidebar, read when it
// opens: the ones the viewer sees (RLS), in the order of the projects list.
export async function loadProjectSwitcher(): Promise<SwitcherProject[]> {
  await requireApproved();
  const { projects, error } = await listProjects();
  if (error) throw new Error("loadProjectSwitcher");
  return projects.map((project) => ({
    id: project.id,
    title: project.title,
    artistName: project.artistName,
    launched: project.stageCount > 0,
  }));
}
