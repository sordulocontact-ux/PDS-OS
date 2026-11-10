import type { ReactNode } from "react";

import { StepSection } from "@/components/shell/journey/step-section";

/**
 * A section of an activation's page, unframed like every step's
 * (`StepSection`, docs/DESIGN.md § 4 « Sections d'une étape »): its title in
 * ink, one sentence under it, the gesture of the section (« Ajouter … »)
 * pushed to the right of the title.
 */
export function ActivationSection({
  id,
  title,
  description,
  action,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <StepSection
      id={id}
      title={title}
      description={description}
      aside={action ? <span className="ml-auto">{action}</span> : undefined}
      className="scroll-mt-6"
    >
      {children}
    </StepSection>
  );
}
