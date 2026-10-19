import { CallFacts, CallSource } from "@/components/calls/call-facts";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { callWhen, shortStamp } from "@/lib/calls/prep/dates";
import type { PlannedCall } from "@/lib/calls/prep/planned";
import { fr } from "@/lib/i18n/fr";

import { AttendeeChipList } from "./attendee-chip";

/**
 * The call once prepared, in its step (proto `prepGate`, after creation):
 * « Échange prévu · Mar. 20/10/2026 à 14:00 · Visio · créé par … le … »,
 * the link of the video, the participants, the agenda, then how it is
 * recorded. `waiting`: what someone else than the owner reads instead of
 * the buttons (« En attente de Lina Haddad : … »).
 */
export function PlannedCallFacts({
  call,
  noun,
  format,
  waiting,
}: {
  call: PlannedCall;
  noun: "exchange" | "call";
  // The module knows it (its link table); else the link decides.
  format?: "video" | "in_person" | null;
  waiting?: { name: string; what: string } | null;
}) {
  const t = fr.callPrep.planned;
  const how = format ?? (call.meetingUrl ? "video" : null);
  return (
    <section className="flex flex-col gap-3">
      <CallFacts
        facts={[
          {
            label: t[noun],
            value: (
              <>
                {t.when(
                  callWhen(call.occurredAt),
                  how ? fr.callPrep.formats[how] : null,
                )}{" "}
                {call.createdBy && (
                  <CallSource>
                    · {t.createdBy(call.createdBy, shortStamp(call.createdAt))}
                  </CallSource>
                )}
              </>
            ),
          },
          ...(call.meetingUrl
            ? [
                {
                  label: t.link,
                  value: (
                    <a
                      href={call.meetingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all underline underline-offset-2"
                    >
                      {call.meetingUrl}
                    </a>
                  ),
                },
              ]
            : []),
          {
            label: t.participants,
            value: <AttendeeChipList people={call.people} />,
          },
          {
            label: t.agenda,
            value:
              call.agenda.map((topic, i) => `${i + 1}. ${topic}`).join(" · ") ||
              "—",
          },
        ]}
      />
      <p className="text-body-md text-[color:var(--text-secondary)]">
        {t.note[noun]}
      </p>
      {waiting ? (
        <p className="text-caption text-[color:var(--text-tertiary)]">
          {t.waiting(waiting.name, waiting.what)}
        </p>
      ) : (
        call.projectId && (
          <ViewLink
            href={routes.projectCall(call.projectId, call.callId)}
            className="self-start text-body-md font-semibold underline underline-offset-2"
          >
            {t.open}
          </ViewLink>
        )
      )}
    </section>
  );
}
