"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { AttendeeChips } from "@/components/calls/prep/attendee-chips";
import {
  CallSlotFields,
  type SlotErrors,
} from "@/components/calls/call-slot-fields";
import { MeetField } from "@/components/calls/meet-field";
import { Button } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import type { ActionResult } from "@/lib/calls/constants";
import type { CallContact } from "@/lib/calls/invite";
import type { PrepPerson } from "@/lib/calls/prep/types";
import { instantOf, slotFrom, slotMinutes } from "@/lib/calls/slot";
import { calls } from "@/lib/i18n/fr/calls";
import { cn } from "@/lib/utils";

const fr = { calls };

type Member = { personId: string; name: string };

type Errors = SlotErrors & { title?: string; link?: string };

/**
 * A new call, as in Teams: its name, who takes part (team, Réseau, e-mail),
 * the day and the slot, and its video link (a Google Meet created for it, or
 * a pasted link). Shared by a project's « Nouveau call » and the « Nouvelle
 * réunion » of the Calls page. Missing fields turn red at the first try, the
 * button is never disabled for them (docs/DESIGN.md § 4).
 */
export function CallPlanForm({
  action,
  hidden,
  defaultTitle,
  titlePlaceholder,
  defaultOccurredAt,
  defaultEnd,
  members,
  memberDetail,
  defaultMemberIds,
  contacts,
  participantsHint,
  googleMeet,
  defaultUrl,
  submitLabel,
  pendingLabel,
  cancelLabel,
  onCancel,
  onSaved,
  footer = "end",
}: {
  action: (
    previous: ActionResult | null,
    form: FormData,
  ) => Promise<ActionResult>;
  // Sent as is (projectId, stay).
  hidden?: Record<string, string>;
  defaultTitle?: string;
  titlePlaceholder: string;
  // "YYYY-MM-DDTHH:mm" or "" (nothing said yet: fields left to fill).
  defaultOccurredAt: string;
  // "HH:mm": a slot picked in the calendar; 30 minutes otherwise.
  defaultEnd?: string;
  members: Member[];
  memberDetail: string;
  defaultMemberIds: string[];
  contacts: CallContact[];
  participantsHint: string;
  googleMeet: boolean;
  defaultUrl?: string;
  submitLabel: string;
  pendingLabel: string;
  cancelLabel: string;
  onCancel?: () => void;
  // Created from PO's panel: the page stays and gets the new call's id.
  onSaved?: (id: string) => void;
  // Buttons on the right (modal) or the left (card in a page).
  footer?: "start" | "end";
}) {
  const t = fr.calls.schedule;
  const idPrefix = useId();
  const root = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(action, null);
  const [slot, setSlot] = useState(() => {
    const initial = slotFrom(defaultOccurredAt);
    return defaultEnd && initial.start
      ? { ...initial, end: defaultEnd }
      : initial;
  });
  // A pasted link (a PO draft) wins over a new Meet.
  const [google, setGoogle] = useState(googleMeet && !defaultUrl);
  const [tried, setTried] = useState(false);
  // The form's reference time, taken once when it opens.
  const [openedAt] = useState(() => Date.now());
  const [title, setTitle] = useState(defaultTitle ?? "");
  const [link, setLink] = useState(defaultUrl ?? "");
  // Who takes part: members and contacts by id, addresses typed.
  const [pool] = useState<PrepPerson[]>(() => [
    ...members.map((m) => ({
      key: `m:${m.personId}`,
      name: m.name,
      detail: memberDetail,
      external: false,
      invite: "app" as const,
      email: null,
    })),
    ...contacts.map((c) => ({
      key: `c:${c.contactId}`,
      name: c.name,
      detail: c.roles || t.contactNoEmail,
      external: true,
      invite: c.email ? ("email" as const) : null,
      email: c.email?.toLowerCase() ?? null,
    })),
  ]);
  const [people, setPeople] = useState<PrepPerson[]>(() =>
    pool.filter(
      (p) => defaultMemberIds.includes(p.key.slice(2)) && !p.external,
    ),
  );

  useEffect(() => {
    if (state?.ok && state.id) onSaved?.(state.id);
    // onSaved changes with each render of the parent; the result is what counts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const pasted = !googleMeet || !google;
  // A slot already over is allowed (a call recorded afterwards), but said:
  // Google sends no invitation for it (Sacha's test of 10/10/2026).
  const startsAt =
    slot.date && slot.start ? instantOf(slot.date, slot.start) : "";
  const past = startsAt !== "" && new Date(startsAt).getTime() < openedAt;
  const found: Errors = {
    title: title.trim() ? undefined : t.titleMissing,
    date: slot.date ? undefined : t.dateMissing,
    start: slot.start ? undefined : t.startMissing,
    end: !slot.end
      ? t.endMissing
      : slot.start && slotMinutes(slot) === null
        ? t.endBeforeStart
        : undefined,
    link:
      pasted && link.trim() && !/^https:\/\/\S+$/.test(link.trim())
        ? t.linkInvalid
        : undefined,
  };
  const missing = Object.values(found).filter(Boolean).length;
  // Nothing in red before the first try.
  const errors: Errors = tried ? found : {};

  const submit = (form: FormData) => {
    if (pending) return;
    setTried(true);
    if (missing > 0) {
      requestAnimationFrame(() =>
        root.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    form.set("occurredAt", instantOf(slot.date, slot.start));
    form.set("endsAt", instantOf(slot.date, slot.end));
    startTransition(() => formAction(form));
  };

  return (
    <form
      ref={root}
      // onSubmit, not `action`: React empties a form after its action, and a
      // refused try must keep what was typed (the name, Sacha 10/10/2026).
      onSubmit={(e) => {
        e.preventDefault();
        submit(new FormData(e.currentTarget));
      }}
      noValidate
      onInput={(e) => {
        const target = e.target as HTMLInputElement;
        if (target.name === "title") setTitle(target.value);
        if (target.name === "meetingUrl") setLink(target.value);
      }}
      className="flex flex-col gap-6"
    >
      {Object.entries(hidden ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Field
        id={`${idPrefix}-title`}
        name="title"
        label={t.fieldTitle}
        required
        maxLength={200}
        autoComplete="off"
        placeholder={titlePlaceholder}
        defaultValue={defaultTitle}
        error={errors.title}
      />
      <AttendeeChips
        id={`${idPrefix}-people`}
        pool={pool}
        value={people}
        onChange={setPeople}
        hint={participantsHint}
        hiddenNames
        filesEmails={false}
      />
      <CallSlotFields
        idPrefix={idPrefix}
        slot={slot}
        onChange={setSlot}
        errors={errors}
      />
      {past && (
        <ToneCallout tone="warning">
          {googleMeet && google ? t.pastSlotGoogle : t.pastSlot}
        </ToneCallout>
      )}
      <MeetField
        idPrefix={idPrefix}
        available={googleMeet}
        google={google}
        onGoogleChange={(value) => {
          setGoogle(value);
          // The link field is mounted again with its first value.
          setLink(defaultUrl ?? "");
        }}
        defaultUrl={defaultUrl}
        error={errors.link}
      />
      {tried && missing > 0 ? (
        <FormMessage kind="error">{t.missingCount(missing)}</FormMessage>
      ) : (
        state &&
        !state.ok && (
          <FormMessage kind="error">{fr.calls.errors[state.error]}</FormMessage>
        )
      )}
      <div
        className={cn(
          "flex flex-col-reverse gap-2 sm:justify-end",
          // On the left, the main button comes first.
          footer === "end" ? "sm:flex-row" : "sm:flex-row-reverse",
        )}
      >
        {onCancel && (
          <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
            {cancelLabel}
          </Button>
        )}
        <Button type="submit" size="lg" aria-busy={pending || undefined}>
          {pending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
