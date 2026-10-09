"use client";

import { usePathname } from "next/navigation";

import { ProcessSteps } from "@/components/ui/process-steps";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import {
  LEGAL_STEP_KEYS,
  builtLegalStepOf,
  legalChevronHref,
  legalCurrentStep,
  type LegalStepKey,
} from "@/lib/ui/legal-steps";

// The Juridique's five steps as chevrons, at the top of the section — same
// place and component as the other workflows' (ticket « Architecture
// globale » § 7: « État des lieux > Cadrage juridique > Confirmation > Plan
// d'action > Suivi »). The first three open the État des lieux at their
// block, the last two the plan's page. The Confirmation waits for every
// answer, the Plan d'action for the confirmed dossier, the Suivi for the
// launched plan: each greyed with its reason until then. Hides itself
// elsewhere, so the layout renders it around every project page.
// `done`: the steps really done, computed by the code
// (lib/workflow-status/rules.ts, legalState).
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

  const page = builtLegalStepOf(
    pathname.slice(base.length).split("/").filter(Boolean),
  );
  const current = page ? legalCurrentStep(page, done) : null;
  const lockOf = (key: LegalStepKey): string | undefined =>
    key === "confirmation" && !done.includes("framing")
      ? t.confirmationLocked
      : key === "plan" && !done.includes("confirmation")
        ? t.planLocked
        : key === "tracking" && !done.includes("plan")
          ? t.trackingLocked
          : undefined;

  return (
    <ProcessSteps
      label={t.label}
      numbered={false}
      steps={LEGAL_STEP_KEYS.map((key) => {
        const locked = lockOf(key);
        return {
          key,
          label: t[key],
          href: locked ? undefined : legalChevronHref(projectId, key),
          title: locked,
          current: current === key,
          done: done.includes(key),
        };
      })}
    />
  );
}
