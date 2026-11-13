import { FormMessage } from "@/components/auth/form-message";
import { GoogleAccountServices } from "@/components/settings/google-account-services";
import { buttonVariants } from "@/components/ui/button";
import type { Access } from "@/lib/auth/access";
import { loadGoogleConnections } from "@/lib/google/connections";
import type { ConnectOutcome } from "@/lib/google/services";
import { googleConnections } from "@/lib/i18n/fr/google-connections";

const t = googleConnections;

/**
 * Paramètres › Connexions, read apart (Suspense): Google may take a moment to
 * answer, the rest of the page does not wait for it. `outcome`: how
 * « Connecter un compte Google » just ended.
 */
export async function GoogleConnectionsSection({
  access,
  outcome,
}: {
  access: Access;
  outcome: ConnectOutcome | null;
}) {
  const connections = await loadGoogleConnections(access);
  if (connections.kind === "error")
    return <FormMessage kind="error">{t.loadError}</FormMessage>;
  const { accounts, canConnect, workMissing } = connections;
  return (
    <div className="flex flex-col gap-5">
      {outcome && (
        <FormMessage kind={outcome === "failed" ? "error" : "info"}>
          {t.outcome[outcome]}
        </FormMessage>
      )}
      {accounts.map((account) => (
        <GoogleAccountServices key={account.email} account={account} />
      ))}
      {workMissing && (
        <p className="text-sm text-muted-foreground">
          {t.workMissing(workMissing.domain)}
        </p>
      )}
      {accounts.length === 0 && !workMissing && !canConnect && (
        <p className="text-sm text-muted-foreground">{t.none}</p>
      )}
      {canConnect && (
        // A full navigation: the route leaves for Google's consent page.
        <a
          href="/api/google/connect"
          className={buttonVariants({
            variant: "outline",
            className: "self-start",
          })}
        >
          {t.connect}
        </a>
      )}
    </div>
  );
}
