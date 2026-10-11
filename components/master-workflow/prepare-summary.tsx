import { IconCheck } from "nucleo-sharp-essential";
import Link from "next/link";

import { PageSection } from "@/components/shell/page-section";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type { StepView } from "@/lib/master-workflow/transmission";
import { cn } from "@/lib/utils";

/**
 * Where the preparation of the mix stands, at the top of the Source step: the
 * source of each title, the Brief Mix/Master, then the sending to the mix
 * engineer — each line with the one way forward (Sacha, 07/10/2026: « la
 * plus simple, la plus fluide »). Read from the Mix step's own view: the
 * same blockers the sending checks.
 */
export function PrepareSummary({ view }: { view: StepView }) {
  const t = fr.masterWorkflow.prepare;
  const confirmed = view.titles.filter((title) => title.source).length;
  // Every title already has its master final: nothing to source nor to mix.
  const nothingToMix = view.titles.length === 0 && view.finished > 0;
  const sourcesDone =
    nothingToMix ||
    (view.titles.length > 0 && confirmed === view.titles.length);
  const briefDone = view.brief !== null && view.engineer !== null;
  const ready = view.blockers.length === 0;
  const sent = view.history.length > 0;

  const lines = [
    {
      key: "sources",
      done: sourcesDone,
      title: t.sources.title,
      detail: nothingToMix
        ? t.sources.finished(view.finished)
        : view.titles.length === 0
          ? t.sources.none
          : t.sources.count(confirmed, view.titles.length),
      action: sourcesDone ? null : (
        <Button
          size="xs"
          variant="outline"
          nativeButton={false}
          render={<Link href="#master-sources" />}
        >
          {t.sources.action}
        </Button>
      ),
    },
    {
      key: "brief",
      done: briefDone || nothingToMix,
      title: t.brief.title,
      detail: view.engineer
        ? t.brief.engineer(view.engineer.name)
        : nothingToMix
          ? t.brief.notNeeded
          : view.brief
            ? t.brief.noEngineer
            : t.brief.empty,
      action: (
        <Button
          size="xs"
          variant={
            briefDone || !sourcesDone || nothingToMix ? "outline" : "default"
          }
          nativeButton={false}
          render={
            <Link href={routes.projectMasterStep(view.projectId, "brief")} />
          }
        >
          {briefDone || nothingToMix ? t.brief.open : t.brief.fill}
        </Button>
      ),
    },
    {
      key: "send",
      done: sent || nothingToMix,
      title: t.send.title,
      detail: sent
        ? t.send.sent
        : nothingToMix
          ? t.send.nothing
          : ready
            ? t.send.ready
            : view.blockers.join(" "),
      action: nothingToMix ? (
        <Button
          size="xs"
          variant="outline"
          nativeButton={false}
          render={
            <Link href={routes.projectMasterStep(view.projectId, "final")} />
          }
        >
          {t.send.final}
        </Button>
      ) : ready || sent ? (
        <Button
          size="xs"
          variant={ready && !sent ? "default" : "outline"}
          nativeButton={false}
          render={
            <Link href={routes.projectMasterStep(view.projectId, "mix")} />
          }
        >
          {sent ? t.send.follow : t.send.action}
        </Button>
      ) : null,
    },
  ];

  return (
    <PageSection
      card
      id="master-prepare"
      title={t.title}
      description={t.description}
    >
      <ol className="flex flex-col divide-y">
        {lines.map((line) => (
          <li
            key={line.key}
            className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-[1.5px]",
                  line.done
                    ? "border-transparent bg-[color:var(--tone-success-bg)] text-[color:var(--tone-success-fg)]"
                    : "border-dashed border-border",
                )}
              >
                {line.done && <IconCheck className="size-3.5" />}
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="font-medium">
                  {line.title}
                  <span className="sr-only">
                    {" "}
                    · {line.done ? t.doneLabel : t.todoLabel}
                  </span>
                </span>
                <span className="text-sm break-words text-muted-foreground">
                  {line.detail}
                </span>
              </div>
            </div>
            {line.action && (
              <div className="shrink-0 pl-9 sm:pl-0">{line.action}</div>
            )}
          </li>
        ))}
      </ol>
    </PageSection>
  );
}
