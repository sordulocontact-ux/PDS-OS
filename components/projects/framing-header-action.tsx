"use client";

import { usePathname } from "next/navigation";

import { RequestValidationButton } from "@/components/framing/request-validation-button";
import { routes } from "@/lib/auth/redirects";

/**
 * "Demander la validation" on the project header, next to the title, only
 * while looking at the Cadrage page itself — the layout already decided
 * whether it applies at all (can edit, stage in progress, nothing already
 * pending: project.stages plus one boolean query, no button to click to get
 * there); this component only decides *where* (which page).
 */
export function FramingHeaderAction({
  projectId,
  stageId,
}: {
  projectId: string;
  stageId: string;
}) {
  const pathname = usePathname();
  if (pathname !== routes.projectFraming(projectId)) return null;

  return (
    <RequestValidationButton
      projectId={projectId}
      stageId={stageId}
      size="sm"
    />
  );
}
