import { AccessWatcher } from "@/components/auth/access-watcher";
import { AuthFrame } from "@/components/auth/auth-frame";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireState } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";

// Email confirmed, access not decided yet. The decision is taken elsewhere,
// so polling is frequent here.
export default async function PendingPage() {
  const access = await requireState(["pending", "unlinked"]);
  const fullName = [access.firstName, access.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <AuthFrame title={fr.auth.pending.title}>
      <AccessWatcher current={access.state} />
      <p className="text-sm text-muted-foreground">
        {access.state === "unlinked"
          ? fr.auth.pending.unlinked
          : fr.auth.pending.body}
      </p>
      <div className="border-t border-border pt-4 text-sm">
        <p className="text-xs text-muted-foreground">
          {fr.auth.pending.signedInAs}
        </p>
        {fullName && <p className="font-semibold">{fullName}</p>}
        <p className="text-muted-foreground">{access.email}</p>
      </div>
      <div>
        <SignOutButton />
      </div>
    </AuthFrame>
  );
}
