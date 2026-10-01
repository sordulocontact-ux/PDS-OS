import { CallActionList } from "@/components/calls/call-action-list";
import { EmptyNote } from "@/components/shell/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CallOutcomes as Outcomes } from "@/lib/calls/outcomes";
import { fr } from "@/lib/i18n/fr";

/**
 * What a call decided and the actions it left, under its recording. An
 * action becomes a task in place (CallActionList); the decisions are read
 * as they were said.
 */
export function CallOutcomes({
  outcomes,
  members,
  mePersonId,
  projectId,
  projects,
}: {
  outcomes: Outcomes;
  members: { personId: string; name: string }[];
  mePersonId: string | null;
  // The call's project, or null for an internal meeting.
  projectId: string | null;
  // Where a task may go: the call's project when the viewer owns it, else
  // (meeting) the launched projects they own. Empty: read only.
  projects: { id: string; title: string }[];
}) {
  const t = fr.calls.outcomes;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <section aria-labelledby="call-decisions" className="grid gap-3">
          <h3 id="call-decisions" className="text-sm font-medium">
            {t.decisionsTitle}
          </h3>
          {outcomes.decisions.length === 0 ? (
            <EmptyNote>{t.decisionsEmpty}</EmptyNote>
          ) : (
            <ul className="grid gap-3">
              {outcomes.decisions.map((decision) => (
                <li key={decision.id} className="grid gap-0.5 text-sm">
                  <span>
                    {decision.what}
                    {decision.who && (
                      <span className="text-muted-foreground">
                        {" "}
                        — {decision.who}
                      </span>
                    )}
                  </span>
                  {decision.why && (
                    <span className="text-muted-foreground">
                      {t.because(decision.why)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="call-actions" className="grid gap-3">
          <h3 id="call-actions" className="text-sm font-medium">
            {t.actionsTitle}
          </h3>
          {outcomes.actions.length === 0 ? (
            <EmptyNote>{t.actionsEmpty}</EmptyNote>
          ) : (
            <CallActionList
              actions={outcomes.actions}
              members={members}
              mePersonId={mePersonId}
              projectId={projectId}
              projects={projects}
            />
          )}
        </section>
      </CardContent>
    </Card>
  );
}
