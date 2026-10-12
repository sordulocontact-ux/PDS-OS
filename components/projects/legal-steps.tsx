"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ProcessSteps } from "@/components/ui/process-steps";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import {
  LEGAL_TABS,
  builtLegalStepOf,
  legalPhase,
  legalTabOf,
  type LegalStepKey,
} from "@/lib/ui/legal-steps";

// The Juridique in two steps as chevrons, at the top of the section — same
// place and component as the Workflow's and the Master's. The État des
// lieux is checked once the dossier is confirmed; the Plan d'action opens
// then (before, it is greyed with its reason). The branches have no entry
// here any more: each action of the plan opens its own. Hides itself
// elsewhere, so the layout renders it around every project page.
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
  const current = page ? legalTabOf(page) : null;
  const confirmed = done.includes("confirmation");
  const launched = done.includes("plan");

  return (
    <div className="flex flex-col gap-2">
      <ProcessSteps
        label={t.label}
        numbered={false}
        steps={LEGAL_TABS.map((key) => {
          const open = key === "inventory" || confirmed;
          return {
            key,
            // The plan once launched is followed: the chevron says so.
            label: key === "plan" && launched ? t.tracking : t[key],
            href: open
              ? key === "inventory"
                ? base
                : routes.projectLegalStep(projectId, "plan")
              : undefined,
            title: open ? undefined : t.planLocked,
            current: current === key,
            done: key === "inventory" ? confirmed : false,
          };
        })}
      />
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-caption text-muted-foreground">
          {t.phase} ·{" "}
          <span className="font-medium text-foreground">
            {t[legalPhase(done)]}
          </span>
        </p>
        {/* The dossier's journal, from every page of the section (JUR-29). */}
        <Link
          href={routes.projectLegalStep(projectId, "history")}
          aria-current={page === "history" ? "page" : undefined}
          className="text-caption font-medium underline underline-offset-4"
        >
          {fr.legalHistory.link}
        </Link>
      </div>
    </div>
  );
}
