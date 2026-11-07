import { CallAudio } from "@/components/calls/call-audio";
import { CallLinkButton } from "@/components/calls/call-link-button";
import { CallParticipantsButton } from "@/components/calls/call-participants-button";
import { JoinCallLink } from "@/components/calls/join-call-link";
import { PreparedCallDetails } from "@/components/calls/prepared-call-details";
import { PageSection } from "@/components/shell/page-section";
import { Avatar } from "@/components/ui/avatar";
import { CopyButton } from "@/components/ui/copy-button";
import type { CallDetail } from "@/lib/calls/queries";
import { calls } from "@/lib/i18n/fr/calls";

const fr = { calls };

/**
 * The side column of a call's page (proto `docs/protos/pages.html`): who
 * takes part (changed by whoever works on the call), what the call was prepared for, its recording once there, its
 * video link (« Rejoindre » while it is to come, « Copier le lien », the
 * link changed by whoever works on the call before it is recorded).
 */
export function CallSide({
  call,
  audioUrls,
  upcoming,
  canEditLink,
  canEditPeople,
}: {
  call: CallDetail;
  audioUrls: Array<string | null>;
  upcoming: boolean;
  canEditLink: boolean;
  // Whoever works on the call changes who takes part.
  canEditPeople: boolean;
}) {
  const t = fr.calls.details;
  const p = fr.calls.page;
  const people = [
    ...call.attendees
      .filter((a) => a.name)
      .map((a) => ({ key: a.personId, name: a.name, detail: t.member })),
    ...call.guests.map((g) => ({
      key: g.email,
      name: g.name ?? g.email,
      detail: g.name ? g.email : t.guest,
    })),
  ];
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageSection
        id="call-participants"
        title={`${p.participants} (${people.length})`}
        card
      >
        {people.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.nobody}</p>
        ) : (
          <ul className="flex flex-col">
            {people.map((person) => (
              <li
                key={person.key}
                className="flex min-h-12 min-w-0 items-center gap-3"
              >
                <Avatar name={person.name} pictureUrl={null} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">
                    {person.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {person.detail}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {canEditPeople && (
          <CallParticipantsButton
            callId={call.id}
            isProject={call.projectId !== null}
          />
        )}
      </PageSection>
      {call.prepared && <PreparedCallDetails prepared={call.prepared} />}
      {call.audioPath && (
        <PageSection id="call-audio" title={p.recording} card>
          <CallAudio call={call} audioUrls={audioUrls} />
        </PageSection>
      )}
      {(call.meetingUrl || canEditLink) && (
        <PageSection id="call-visio" title={p.visio} card>
          {call.meetingUrl ? (
            <a
              href={call.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              translate="no"
              className="w-fit rounded-sm font-mono text-sm font-medium break-all underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {call.meetingUrl.replace(/^https:\/\//, "")}
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">{t.noLink}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {call.meetingUrl && upcoming && (
              <JoinCallLink
                url={call.meetingUrl}
                title={call.title}
                size="sm"
              />
            )}
            {call.meetingUrl && (
              <CopyButton
                value={call.meetingUrl}
                label={t.copy}
                copiedLabel={t.copied}
                failedLabel={t.copyFailed}
                variant="ghost"
                size="sm"
              />
            )}
            {canEditLink && (
              <CallLinkButton callId={call.id} meetingUrl={call.meetingUrl} />
            )}
          </div>
        </PageSection>
      )}
    </div>
  );
}
