import { IconClipboard, IconPaperPlane2 } from "nucleo-sharp-essential";

import { CallLinkButton } from "@/components/calls/call-link-button";
import { JoinCallLink } from "@/components/calls/join-call-link";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { sectionCardClass } from "@/components/ui/section-card";
import type { CallDetail } from "@/lib/calls/queries";
import { callSheetSubject, callSheetText, callWhen } from "@/lib/calls/sheet";
import { calls } from "@/lib/i18n/fr/calls";
import { cn } from "@/lib/utils";
import { mailtoHref } from "@/lib/utils/mailto";

const fr = { calls };

/**
 * A call's details, as Teams shows a meeting: when, what it belongs to, who
 * organizes it, its video link written out (« Rejoindre », « Copier le
 * lien »), who takes part, and its sheet to share with people outside the
 * label. The first thing read on a call's page.
 */
export function CallDetails({
  call,
  where,
  organizer,
  canEditLink,
}: {
  call: CallDetail;
  // The project (a link) or « Réunion interne ».
  where: React.ReactNode;
  organizer: string | null;
  // Whoever works on the call, before it is recorded.
  canEditLink: boolean;
}) {
  const t = fr.calls.details;
  const sheet = callSheetText(call);
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
    <section
      aria-labelledby="call-details-title"
      className={cn(sectionCardClass, "flex flex-col gap-6")}
    >
      <h2 id="call-details-title" className="sr-only">
        {t.title}
      </h2>
      <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))]">
        <div className="flex flex-col gap-0.5 sm:col-span-2">
          <dt className="text-xs text-muted-foreground">{t.when}</dt>
          <dd className="font-medium first-letter:uppercase">
            <time dateTime={call.occurredAt}>{callWhen(call)}</time>
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">{t.where}</dt>
          <dd className="font-medium break-words">{where}</dd>
        </div>
        {organizer && (
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">{t.organizer}</dt>
            <dd className="font-medium break-words">{organizer}</dd>
          </div>
        )}
      </dl>

      <div className="flex flex-col gap-3 border-t border-[color:var(--border-hairline)] pt-5">
        <h3 className="text-xs text-muted-foreground">{t.link}</h3>
        {call.meetingUrl ? (
          <>
            <a
              href={call.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              translate="no"
              className="w-fit rounded-sm font-mono text-sm font-medium break-all underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {call.meetingUrl.replace(/^https:\/\//, "")}
            </a>
            <div className="flex flex-wrap items-center gap-2">
              {!call.audioPath && (
                <JoinCallLink
                  url={call.meetingUrl}
                  title={call.title}
                  variant="default"
                />
              )}
              <CopyButton
                value={call.meetingUrl}
                label={t.copy}
                copiedLabel={t.copied}
                failedLabel={t.copyFailed}
                size="default"
              />
              {canEditLink && (
                <CallLinkButton callId={call.id} meetingUrl={call.meetingUrl} />
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-muted-foreground">{t.noLink}</p>
            {canEditLink && (
              <CallLinkButton callId={call.id} meetingUrl={null} />
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-[color:var(--border-hairline)] pt-5">
        <h3 className="text-xs text-muted-foreground">
          {t.participants(people.length)}
        </h3>
        {people.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.nobody}</p>
        ) : (
          <ul className="grid gap-x-6 sm:grid-cols-2">
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
      </div>

      <div className="flex flex-col gap-3 border-t border-[color:var(--border-hairline)] pt-5">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-xs text-muted-foreground">{t.share}</h3>
          <p className="text-sm text-muted-foreground">{t.shareHint}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CopyButton
            value={sheet}
            label={t.shareCopy}
            copiedLabel={t.shareCopied}
            failedLabel={t.shareCopyFailed}
            icon={<IconClipboard aria-hidden />}
            size="default"
          />
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <a
                href={mailtoHref(
                  call.guests.map((g) => g.email).join(","),
                  callSheetSubject(call),
                  sheet,
                )}
              />
            }
          >
            <IconPaperPlane2 data-icon="inline-start" aria-hidden />
            {t.shareEmail}
          </Button>
        </div>
      </div>
    </section>
  );
}
