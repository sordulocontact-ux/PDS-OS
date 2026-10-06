import Link from "next/link";

import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";

/**
 * The actions of one kind (Plan, Suivi): what they share said once (the
 * group's name, why, what they wait for) and the button that leads where
 * they are done; then one line each, written by the caller.
 */
export function ActionGroup({
  title,
  count,
  why,
  after,
  action,
  children,
}: {
  title: string;
  count: number;
  why: string | null;
  after: string[];
  // Where the whole group is done, when every action is done at one place.
  action: { href: string; label: string } | null;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="font-medium">
            {title}
            {count > 1 && (
              <span className="text-muted-foreground"> · {count}</span>
            )}
          </h3>
          {why && (
            <p className="text-sm break-words text-muted-foreground">{why}</p>
          )}
          {after.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {fr.legal.plan.after(after.join(", "))}
            </p>
          )}
        </div>
        {action && (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={action.href} />}
          >
            {action.label}
          </Button>
        )}
      </div>
      <ul className="flex flex-col divide-y">{children}</ul>
    </section>
  );
}
