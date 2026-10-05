"use client";

import { usePathname } from "next/navigation";

import { ProcessSteps } from "@/components/ui/process-steps";

export type SectionStep = {
  key: string;
  label: string;
  href: string;
  // Has a page; otherwise greyed, not linked, with `soon` as its title.
  built: boolean;
};

/**
 * The internal steps of a specialised workflow (Master) as chevrons without
 * numbers, under the project header — same place and component as the
 * Workflow's. Hides itself outside the section (`base` and below), so the
 * layout renders it around every project page.
 */
export function SectionSteps({
  base,
  label,
  soon,
  steps,
}: {
  base: string;
  label: string;
  soon: string;
  steps: SectionStep[];
}) {
  const pathname = usePathname();
  if (pathname !== base && !pathname.startsWith(`${base}/`)) return null;

  return (
    <ProcessSteps
      label={label}
      numbered={false}
      steps={steps.map((step) => ({
        key: step.key,
        label: step.label,
        href: step.built ? step.href : undefined,
        title: step.built ? undefined : soon,
        current: pathname === step.href,
      }))}
    />
  );
}
