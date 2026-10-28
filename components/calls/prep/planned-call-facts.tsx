import { buttonVariants } from "@/components/ui/button";
import { LinkPill } from "@/components/ui/link-pill";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { callWhen } from "@/lib/calls/prep/dates";
import type { PlannedCall } from "@/lib/calls/prep/planned";
import { callPrep } from "@/lib/i18n/fr/call-prep";

import { AttendeeChipList } from "./attendee-chip";

const fr = { callPrep };

// Where the call's page opens: its recorder.
const RECORDER_ANCHOR = "call-recording";

/** One fact of the planned call: its label, then its value under it. */
function PlannedFact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <dl className="flex min-w-0 flex-col gap-2">
      <dt className="text-caption text-[color:var(--text-secondary)]">
        {label}
      </dt>
      <dd className="min-w-0 text-body-md font-medium break-words">
        {children}
      </dd>
    </dl>
  );
}

/**
 * The call once prepared, in its step (Figma PDS OS node 282:6170, Sacha
 * 28/10/2026): in one block, when and who organizes it, the video link to
 * open or copy, the participants, the agenda one point per line; then how
 * it is recorded and « Enregistrer l'échange », which opens the call's page
 * on its recorder. `action`: the module records in place instead (the
 * Cadrage: CallRecorder `compact`, « Annuler l'échange » beside it).
 * `waiting`: what someone else than the owner reads instead of the buttons
 * (« En attente de Lina Haddad : … »).
 */
export function PlannedCallFacts({
  call,
  noun,
  waiting,
  action,
}: {
  call: PlannedCall;
  noun: "exchange" | "call";
  waiting?: { name: string; what: string } | null;
  action?: React.ReactNode;
}) {
  const t = fr.callPrep.planned;
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col divide-y divide-[color:var(--border-hairline)] rounded-xl border border-[color:var(--border-hairline)] bg-[var(--surface-page)] px-6 [&>*]:py-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <PlannedFact label={t.when}>{callWhen(call.occurredAt)}</PlannedFact>
          {call.createdBy && (
            <PlannedFact label={t.organizer}>{call.createdBy}</PlannedFact>
          )}
        </div>
        {call.meetingUrl && (
          <PlannedFact label={t.link}>
            <LinkPill
              url={call.meetingUrl}
              copyLabel={t.copy}
              copiedLabel={t.copied}
              open
            />
          </PlannedFact>
        )}
        <PlannedFact label={t.participants}>
          <AttendeeChipList people={call.people} />
        </PlannedFact>
        <PlannedFact label={t.agenda}>
          {call.agenda.length > 0 ? (
            <ol className="flex flex-col gap-1">
              {call.agenda.map((topic, i) => (
                <li key={`${i}-${topic}`}>{`${i + 1}. ${topic}`}</li>
              ))}
            </ol>
          ) : (
            "—"
          )}
        </PlannedFact>
      </div>
      <p className="text-body-md text-[color:var(--text-secondary)]">
        {t.note[noun]}
      </p>
      {waiting ? (
        <p className="text-caption text-[color:var(--text-tertiary)]">
          {t.waiting(waiting.name, waiting.what)}
        </p>
      ) : action ? (
        action
      ) : (
        call.projectId && (
          <ViewLink
            href={`${routes.projectCall(call.projectId, call.callId)}#${RECORDER_ANCHOR}`}
            className={buttonVariants({ size: "sm", className: "self-start" })}
          >
            {t.record[noun]}
          </ViewLink>
        )
      )}
    </section>
  );
}
