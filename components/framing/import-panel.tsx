"use client";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { useCanEditProject } from "@/components/projects/edit-access";
import { Button } from "@/components/ui/button";
import type { FramingData } from "@/lib/framing/queries";
import type { ActionResult } from "@/lib/framing/result";
import { framing } from "@/lib/i18n/fr/framing";

const fr = { framing };

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

/** Imports a call report into a deliverable (Brief or Strategy) as proposals. */
export function ImportPanel({
  reports,
  projectId,
  importAction,
  title,
  hint,
}: {
  reports: FramingData["reports"];
  projectId: string;
  importAction: (projectId: string, reportId: string) => Promise<ActionResult>;
  title: string;
  hint?: string;
}) {
  const t = fr.framing.import;
  const { pending, run } = useFramingAction();
  const canEdit = useCanEditProject();

  // Importing writes into the deliverable: the whole panel is for the owner only.
  if (!canEdit) return null;

  return (
    <section className="grid gap-3">
      <div className="grid gap-1">
        <h3 className="text-body-md font-medium">{title}</h3>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {reports.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <ul className="grid gap-2">
          {reports.map((report) => (
            <li
              key={report.reportId}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span>
                {report.callTitle}
                <span className="block text-xs text-muted-foreground">
                  {dateFormat.format(new Date(report.createdAt))}
                </span>
              </span>
              {report.imported ? (
                <span className="text-xs text-muted-foreground">{t.done}</span>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    run(() => importAction(projectId, report.reportId))
                  }
                >
                  {t.submit}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
