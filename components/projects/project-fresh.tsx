import { Suspense } from "react";

import { KeptFallback, KeptView } from "@/components/shell/kept-view";
import { projectVersion } from "@/lib/projects/version-cache";

/**
 * A zone of a project's page read from the whole project (its navigation
 * and counts, its header, « Maintenant »), which the page never waits for
 * (page loads audit, 27/10/2026, docs/ARCHITECTURE.md § 3 bis). After a
 * Server Action Next renders the page again from its root, and a Suspense
 * already shown holds the whole action until its content is ready again:
 * every button of the Cadrage waited for every workflow's state and journey
 * (110 to 230 requests). Keyed by the project's version, the boundary is a
 * new one after any write: the action ends as soon as the page itself is
 * ready, the zone's last rendering stays in place meanwhile (KeptView), and
 * its new one replaces it when it streams. `fallback`: the first visit.
 */
export async function ProjectFresh({
  projectId,
  id,
  fallback,
  children,
}: {
  projectId: string;
  id: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const version = await projectVersion(projectId);
  return (
    <Suspense
      key={version ?? "none"}
      fallback={<KeptFallback id={id} fallback={fallback} />}
    >
      <KeptView id={id}>{children}</KeptView>
    </Suspense>
  );
}
