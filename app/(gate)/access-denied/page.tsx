import { AccessWatcher } from "@/components/auth/access-watcher";
import { AuthFrame } from "@/components/auth/auth-frame";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireState } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";

export const metadata = {
  title: `${fr.auth.accessDenied.tab} · ${fr.app.name}`,
};

// Rejected, suspended or disabled. The text depends on the state read on the
// server, never on the URL. The internal reason is not shown.
export default async function AccessDeniedPage() {
  const access = await requireState(["rejected", "suspended", "disabled"]);
  const copy =
    access.state === "rejected"
      ? fr.auth.accessDenied.rejected
      : access.state === "suspended"
        ? fr.auth.accessDenied.suspended
        : fr.auth.accessDenied.disabled;

  return (
    <AuthFrame title={copy.title}>
      <AccessWatcher current={access.state} intervalMs={30_000} />
      <p className="text-sm">{copy.body}</p>
      <p className="text-sm text-muted-foreground">
        {fr.auth.accessDenied.contact}
      </p>
      <div>
        <SignOutButton />
      </div>
    </AuthFrame>
  );
}
