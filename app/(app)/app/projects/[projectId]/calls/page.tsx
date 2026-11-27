import { redirect } from "next/navigation";

import { routes } from "@/lib/auth/redirects";
import { viewHref } from "@/lib/ui/view-href";

// The old list's views (?view=) as the Notes' tabs (?tab=).
const TAB_OF_VIEW: Record<string, string> = {
  upcoming: "upcoming",
  past: "calls",
};

/**
 * A project's Calls list is now its Notes (Sacha, 27/11/2026); kept for the
 * links and bookmarks that still point here. The pages of a call
 * (.../calls/<id>) stay where they are.
 */
export default async function ProjectCallsRedirect({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/calls">) {
  const { projectId } = await params;
  const { view } = await searchParams;
  redirect(
    viewHref(routes.projectNotes(projectId), {
      tab: typeof view === "string" ? (TAB_OF_VIEW[view] ?? null) : null,
    }),
  );
}
