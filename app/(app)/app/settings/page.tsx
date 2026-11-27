import { redirect } from "next/navigation";

import { routes } from "@/lib/auth/redirects";

// Paramètres opens on its first page; Google's return (« Connecter un compte
// Google », an older link) goes on to Connexions with its outcome.
export default async function SettingsPage({
  searchParams,
}: PageProps<"/app/settings">) {
  const google = (await searchParams).google;
  redirect(
    typeof google === "string"
      ? `${routes.settingsConnections}?google=${encodeURIComponent(google)}`
      : routes.settingsUsage,
  );
}
