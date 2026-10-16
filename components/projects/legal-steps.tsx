"use client";

import { usePathname } from "next/navigation";

import { ProcessSteps } from "@/components/ui/process-steps";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import {
  LEGAL_STEP_KEYS,
  builtLegalStepOf,
  legalStepHref,
  type LegalStepKey,
} from "@/lib/ui/legal-steps";

// The Juridique's five steps as chevrons, at the top of the section — same
// place and component as the Workflow's and the Master's. Every step is
// linked, a locked one stays readable (docs/VISION-UX.md § 4); the open step
// is the page shown, a branch's page counts as the Suivi it opens from. The
// État des lieux is a read, always done. Hides itself elsewhere, so the
// layout renders it around every project page.
// `done`: the steps really done, computed by the server
// (lib/legal/steps-done.ts).
export function LegalSteps({
  projectId,
  done,
}: {
  projectId: string;
  done: readonly LegalStepKey[];
}) {
  const pathname = usePathname();
  const t = fr.shell.project.legalSteps;
  const base = routes.projectLegal(projectId);
  if (pathname !== base && !pathname.startsWith(`${base}/`)) return null;

  const segments = pathname.slice(base.length).split("/").filter(Boolean);
  const page = builtLegalStepOf(segments);
  const current = page
    ? (LEGAL_STEP_KEYS.find((key) => key === page) ?? "tracking")
    : null;

  const isDone = (key: LegalStepKey) =>
    key === "inventory" || done.includes(key);
  return (
    <ProcessSteps
      label={t.label}
      look="pills"
      steps={LEGAL_STEP_KEYS.map((key, index) => ({
        key,
        label: t[key],
        href: legalStepHref(projectId, key),
        current: current === key,
        done: isDone(key),
        // The path is linear: a step waits while one before it is not done.
        locked:
          !isDone(key) &&
          LEGAL_STEP_KEYS.slice(0, index).some((k) => !isDone(k)),
      }))}
    />
  );
}
