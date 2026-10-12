import Link from "next/link";

import { sectionCardClass } from "@/components/ui/section-card";
import { buttonVariants } from "@/components/ui/button";
import { formatDateTime } from "@/lib/calls/format";
import { fr } from "@/lib/i18n/fr";

export type NextStep = {
  href: string;
  // What prevents the sending, worded by the Mix step (empty: ready).
  blockers: string[];
  // The last sending, if the package already left.
  sentAt: string | null;
};

/**
 * Under the Brief: where to go once it is saved (PROJ-UX-08). The sending
 * happens in Mixage; what it still needs is said here, before anyone tries.
 */
export function BriefNextStep({ next }: { next: NextStep }) {
  const t = fr.masterWorkflow.brief.next;
  return (
    <section
      aria-labelledby="brief-next"
      className={`${sectionCardClass} flex flex-col gap-3`}
    >
      <div className="flex flex-col gap-0.5">
        <h2 id="brief-next" className="text-base font-medium">
          {t.title}
        </h2>
        <p className="text-sm text-muted-foreground">
          {next.sentAt ? t.sentAlready(formatDateTime(next.sentAt)) : t.body}
        </p>
      </div>
      {next.blockers.length === 0 ? (
        <p className="text-body-md">{t.ready}</p>
      ) : (
        <div className="flex flex-col gap-1 text-body-md">
          <p className="font-medium">{t.missing}</p>
          <ul className="list-disc pl-5">
            {next.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </div>
      )}
      <Link
        href={next.href}
        className={buttonVariants({ size: "sm", className: "self-start" })}
      >
        {t.action}
      </Link>
    </section>
  );
}
