import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

// The Distribution workflow (ticket « Architecture globale », 08/10/2026):
// the Sortie page split in its two existing moments, no new capability —
// Préparation (identifiers and date, /release) then En ligne (detection on
// the platforms and smartlink, /release/online). The second page says what
// it waits for while the release is not recorded.
export const distributionPages = (projectId: string) => [
  routes.projectRelease(projectId),
];

export function distributionSteps(
  projectId: string,
  done: readonly string[] = [],
) {
  const t = fr.shell.project.distributionSteps;
  return [
    {
      key: "prepare",
      label: t.prepare,
      href: routes.projectRelease(projectId),
      built: true,
      done: done.includes("prepare"),
    },
    {
      key: "online",
      label: t.online,
      href: routes.projectReleaseOnline(projectId),
      built: true,
      done: done.includes("online"),
    },
  ];
}
