import { FormMessage } from "@/components/auth/form-message";
import { HomeAlso } from "@/components/home/home-also";
import { HomeProjects } from "@/components/home/home-projects";
import { HomeWaiting } from "@/components/home/home-waiting";
import { WelcomeCard } from "@/components/home/welcome-card";
import { GlobalWorkCountReporter } from "@/components/shell/work-count";
import { WorkLead } from "@/components/work/work-lead";
import { can, type Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { loadHomeFeed } from "@/lib/home/feed";
import { loadWelcome } from "@/lib/home/welcome";
import { shell } from "@/lib/i18n/fr/shell";
import { work } from "@/lib/i18n/fr/work";
import { loadMyJourneyWork } from "@/lib/work/journeys";

const fr = { shell, work };

// The home under PO (docs/VISION-UX.md § 2, proto `docs/protos/accueil.html`),
// streamed behind a Suspense boundary: the greeting and PO show first.
// « Maintenant » (the Travail's lead), « Aussi à vous », « Ce que vous
// attendez », « Vos projets »: all read from the projects' journeys and the
// Travail's rows (lib/home/feed.ts), never from a list of their own.
export async function HomeFeed({ access }: { access: Access }) {
  const t = fr.shell.home;
  const [feed, journeys, welcome] = await Promise.all([
    loadHomeFeed(access),
    loadMyJourneyWork(),
    loadWelcome(access),
  ]);
  const { lead } = feed;
  // Nothing anywhere yet: « Maintenant » says what will arrive.
  const first = !lead && feed.projects.length === 0 && !feed.error;

  return (
    <div className="flex flex-col gap-10">
      {feed.error && (
        <FormMessage kind="error">{fr.work.journeys.partial}</FormMessage>
      )}
      {welcome && <WelcomeCard variant={welcome} />}
      <div className="flex flex-col gap-4">
        <WorkLead
          row={lead}
          empty={first ? { title: t.firstTitle, body: t.firstBody } : undefined}
        />
        <HomeAlso rows={feed.also} />
      </div>
      <HomeWaiting items={feed.waiting} />
      <HomeProjects
        projects={feed.projects}
        viewerId={access.personId}
        newProjectHref={
          can(access, "assign_projects") ? routes.projectsNew : null
        }
      />
      <GlobalWorkCountReporter byProject={journeys.byProject} />
    </div>
  );
}
