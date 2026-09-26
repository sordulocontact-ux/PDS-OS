import Link from "next/link";
import { AccessWatcher } from "@/components/auth/access-watcher";
import { AuthFrame } from "@/components/auth/auth-frame";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { buttonVariants } from "@/components/ui/button";
import { requireState } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

// The database did not answer. Access stays closed, but the screen tells the
// truth: an outage, not an account problem. Reloading is enough once it is
// back.

export const dynamic = "force-dynamic";

export default async function UnavailablePage() {
  const access = await requireState(["unavailable"]);

  return (
    <AuthFrame title={fr.auth.unavailable.title}>
      <AccessWatcher current={access.state} />
      <p className="text-sm">{fr.auth.unavailable.body}</p>
      <p className="text-sm text-muted-foreground">
        {fr.auth.unavailable.instruction}
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href={routes.unavailable}
          className={buttonVariants({ size: "lg" })}
        >
          {fr.auth.unavailable.retry}
        </Link>
        <SignOutButton variant="ghost" />
      </div>
    </AuthFrame>
  );
}
