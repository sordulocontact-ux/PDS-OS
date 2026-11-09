import { FormMessage } from "@/components/auth/form-message";
import { HomeAlso } from "@/components/home/home-also";
import { HomeMyTasks } from "@/components/home/home-my-tasks";
import { HomeProjects } from "@/components/home/home-projects";
import { HomeWaiting } from "@/components/home/home-waiting";
import { OnboardingAutoOpen } from "@/components/onboarding/onboarding-provider";
import { GlobalWorkCountReporter } from "@/components/shell/work-count";
import { WorkLead } from "@/components/work/work-lead";
import { can, type Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { loadHomeFeed } from "@/lib/home/feed";
import { loadWelcome } from "@/lib/home/welcome";
import { shell } from "@/lib/i18n/fr/shell";
import { work } from "@/lib/i18n/fr/work";
import { todayInParis } from "@/lib/insights/dates";
import { loadMyJourneyWork } from "@/lib/work/journeys";
import { addMyMeetingTasks } from "@/lib/work/meeting-tasks";
import { homeTasksOf } from "@/lib/work/personal-tasks";
import { loadMyPersonalTasks } from "@/lib/work/personal-tasks-queries";

const fr = { shell, work };

// The home under PO (docs/VISION-UX.md § 2, proto `docs/protos/accueil.html`),
// streamed behind a Suspense boundary: the greeting and PO show first.
// « Maintenant » (the Travail's lead), « Aussi à vous », « Ce que vous
// attendez », « Vos projets »: all read from the projects' journeys and the
// Travail's rows (lib/home/feed.ts), never from a list of their own. Between
// them, « Vos tâches »: the urgent ones of « Mes tâches », the person's own
// (with what their meetings put in).
export async function HomeFeed({ access }: { access: Access }) {
  const t = fr.shell.home;
  const [feed, journeys, welcome, personal] = await Promise.all([
    loadHomeFeed(access),
    loadMyJourneyWork(),
    loadWelcome(access),
    // What the meetings ask first put in « Mes tâches », then read.
    addMyMeetingTasks(access).then(() => loadMyPersonalTasks()),
  ]);
  const today = todayInParis();
  const { lead } = feed;
  // Nothing anywhere yet: « Maintenant » says what will arrive.
  const first = !lead && feed.projects.length === 0 && !feed.error;

  return (
    <div className="flex flex-col gap-10">
      {feed.error && (
        <FormMessage kind="error">{fr.work.journeys.partial}</FormMessage>
      )}
      {welcome && <OnboardingAutoOpen />}
      <div className="flex flex-col gap-4">
        <WorkLead
          row={lead}
          empty={first ? { title: t.firstTitle, body: t.firstBody } : undefined}
        />
        <HomeAlso rows={feed.also} />
      </div>
      <HomeMyTasks tasks={homeTasksOf(personal.todo, today)} today={today} />
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
