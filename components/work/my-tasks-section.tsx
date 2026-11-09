import { FormMessage } from "@/components/auth/form-message";
import { MyTasks } from "@/components/work/my-tasks";
import type { Access } from "@/lib/auth/access";
import { work } from "@/lib/i18n/fr/work";
import { todayInParis } from "@/lib/insights/dates";
import { addMyMeetingTasks } from "@/lib/work/meeting-tasks";
import { loadMyPersonalTasks } from "@/lib/work/personal-tasks-queries";

const fr = { work };

// « Mes tâches », streamed behind a Suspense boundary of the Travail: what
// the person's recent meetings ask them first put in, then their tasks.
export async function MyTasksSection({ access }: { access: Access }) {
  const meetingsFailed = await addMyMeetingTasks(access);
  const { todo, done, error } = await loadMyPersonalTasks();
  return (
    <>
      {error && (
        <FormMessage kind="error">{fr.work.tasks.loadError}</FormMessage>
      )}
      {!error && meetingsFailed && (
        <FormMessage kind="error">{fr.work.tasks.meetingsPartial}</FormMessage>
      )}
      <MyTasks todo={todo} done={done} today={todayInParis()} />
    </>
  );
}
