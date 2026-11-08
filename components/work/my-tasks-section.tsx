import { FormMessage } from "@/components/auth/form-message";
import { MyTasks } from "@/components/work/my-tasks";
import type { Access } from "@/lib/auth/access";
import { work } from "@/lib/i18n/fr/work";
import { todayInParis } from "@/lib/insights/dates";
import { loadMyCallSuggestions } from "@/lib/work/call-suggestions";
import { loadMyPersonalTasks } from "@/lib/work/personal-tasks-queries";

const fr = { work };

// « Mes tâches », streamed behind a Suspense boundary of the Travail: the
// person's tasks and what their recent meetings suggest them.
export async function MyTasksSection({ access }: { access: Access }) {
  const [{ todo, done, error }, suggested] = await Promise.all([
    loadMyPersonalTasks(),
    loadMyCallSuggestions(access),
  ]);
  return (
    <>
      {error && (
        <FormMessage kind="error">{fr.work.tasks.loadError}</FormMessage>
      )}
      {!error && suggested.error && (
        <FormMessage kind="error">
          {fr.work.tasks.suggestions.partial}
        </FormMessage>
      )}
      <MyTasks
        todo={todo}
        done={done}
        suggestions={suggested.suggestions}
        today={todayInParis()}
      />
    </>
  );
}
