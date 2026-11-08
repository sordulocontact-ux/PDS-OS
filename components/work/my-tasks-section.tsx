import { FormMessage } from "@/components/auth/form-message";
import { MyTasks } from "@/components/work/my-tasks";
import { work } from "@/lib/i18n/fr/work";
import { todayInParis } from "@/lib/insights/dates";
import { loadMyPersonalTasks } from "@/lib/work/personal-tasks-queries";

const fr = { work };

// « Mes tâches », streamed behind a Suspense boundary of the Travail.
export async function MyTasksSection() {
  const { todo, done, error } = await loadMyPersonalTasks();
  return (
    <>
      {error && (
        <FormMessage kind="error">{fr.work.tasks.loadError}</FormMessage>
      )}
      <MyTasks todo={todo} done={done} today={todayInParis()} />
    </>
  );
}
