"use client";

import { usePathname } from "next/navigation";

import { ProcessSteps } from "@/components/ui/process-steps";

export type SectionStep = {
  key: string;
  label: string;
  href: string;
  // Has a page and may be opened; otherwise greyed, not linked, with
  // `title` (why it is closed) or `soon` as its title.
  built: boolean;
  title?: string;
  // Really done (computed by the server): a check before the label.
  done?: boolean;
  // Other pages the step covers (a sub-page opened from it): current there
  // too.
  also?: string[];
  // Every page below its own (one per deliverable): current there too.
  nested?: boolean;
};

/**
 * The steps of a workflow (Master, Marketing) as chevrons without numbers,
 * under the project header — same place and component as the Juridique's.
 * Hides itself outside the workflow's pages (`within` and below), so the
 * layout renders it around every project page.
 */
export function SectionSteps({
  within,
  label,
  soon,
  steps,
}: {
  within: string[];
  label: string;
  soon: string;
  steps: SectionStep[];
}) {
  const pathname = usePathname();
  const inside = within.some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
  if (!inside) return null;

  return (
    <ProcessSteps
      label={label}
      numbered={false}
      steps={steps.map((step) => ({
        key: step.key,
        label: step.label,
        href: step.built ? step.href : undefined,
        title: step.built ? undefined : (step.title ?? soon),
        done: step.done,
        current:
          pathname === step.href ||
          !!step.also?.includes(pathname) ||
          (!!step.nested && pathname.startsWith(`${step.href}/`)),
      }))}
    />
  );
}
