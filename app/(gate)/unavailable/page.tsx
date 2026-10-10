import Link from "next/link";
import { redirect } from "next/navigation";

import { AccessWatcher } from "@/components/auth/access-watcher";
import { AuthFrame } from "@/components/auth/auth-frame";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { buttonVariants } from "@/components/ui/button";
import { getAccess, requireState } from "@/lib/auth/dal";
import { safeReturnPath, unavailableFrom } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

// The database did not answer. Access stays closed, but the screen tells the
// truth: an outage, not an account problem. Reloading is enough once it is
// back, and « Réessayer » goes back to the page the person was on (`next`).

export const dynamic = "force-dynamic";

export default async function UnavailablePage({
  searchParams,
}: PageProps<"/unavailable">) {
  const { next } = await searchParams;
  const returnTo = safeReturnPath(Array.isArray(next) ? next[0] : next);
  // The database answers again: straight back to that page.
  if ((await getAccess()).state === "approved") redirect(returnTo);
  const access = await requireState(["unavailable"]);

  return (
    <AuthFrame title={fr.auth.unavailable.title}>
      <AccessWatcher current={access.state} returnTo={returnTo} />
      <p className="text-sm">{fr.auth.unavailable.body}</p>
      <p className="text-sm text-muted-foreground">
        {fr.auth.unavailable.instruction}
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href={unavailableFrom(returnTo)}
          className={buttonVariants({ size: "lg" })}
        >
          {fr.auth.unavailable.retry}
        </Link>
        <SignOutButton variant="ghost" />
      </div>
    </AuthFrame>
  );
}
