"use client";

import { IconXmark } from "nucleo-sharp-essential";
import { useId, useMemo, useState } from "react";

import { FieldError } from "@/components/auth/form-message";
import { SearchPicker } from "@/components/catalog/search-picker";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { CallContact } from "@/lib/calls/invite";
import { fr } from "@/lib/i18n/fr";
import { isEmail } from "@/lib/utils/email";

type Member = { personId: string; name: string };

type Picked =
  | { kind: "member"; key: string; personId: string; name: string }
  | {
      kind: "contact";
      key: string;
      contactId: string;
      name: string;
      email: string;
    }
  | { kind: "email"; key: string; email: string };

/**
 * Who takes part in a call, as in Teams: one search over the team and the
 * Réseau, or an e-mail address typed for someone outside. Members are
 * notified in the app; contacts and addresses are invited by e-mail (Google
 * Calendar). Sent as two JSON fields: `attendees` (person ids) and `guests`
 * ({ contactId } or { email }).
 */
export function AttendeesField({
  members,
  memberDetail,
  contacts,
  defaultMemberIds,
  hint,
}: {
  // Who can be invited in the app: the other members, or the project's team.
  members: Member[];
  memberDetail: string;
  contacts: CallContact[];
  defaultMemberIds: string[];
  hint: string;
}) {
  const t = fr.calls.schedule;
  const id = useId();
  const [picked, setPicked] = useState<Picked[]>(() =>
    members
      .filter((m) => defaultMemberIds.includes(m.personId))
      .map((m) => ({ kind: "member", key: `m:${m.personId}`, ...m })),
  );
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(
    () => [
      ...members.map((m) => ({
        id: `m:${m.personId}`,
        label: m.name,
        detail: memberDetail,
      })),
      ...contacts.map((c) => ({
        id: `c:${c.contactId}`,
        label: c.name,
        detail: [c.roles, c.email ?? t.contactNoEmail]
          .filter(Boolean)
          .join(" · "),
      })),
    ],
    [members, contacts, memberDetail, t.contactNoEmail],
  );
  const pickedKeys = useMemo(() => new Set(picked.map((p) => p.key)), [picked]);
  const memberKeys = useMemo(
    () => new Set(members.map((m) => `m:${m.personId}`)),
    [members],
  );
  // An address typed twice, or already a contact's, is invited once.
  const pickedEmails = new Set(
    picked.flatMap((p) => (p.kind === "member" ? [] : [p.email])),
  );

  function pick(optionId: string) {
    setError(null);
    const [kind, value] = [optionId.slice(0, 1), optionId.slice(2)];
    if (kind === "m") {
      const member = members.find((m) => m.personId === value);
      if (member)
        setPicked((all) => [
          ...all,
          { kind: "member", key: optionId, ...member },
        ]);
      return;
    }
    const contact = contacts.find((c) => c.contactId === value);
    if (!contact) return;
    if (!contact.email) {
      setError(t.contactWithoutEmail(contact.name));
      return;
    }
    const email = contact.email.toLowerCase();
    setPicked((all) => [
      ...all.filter((p) => !(p.kind === "email" && p.email === email)),
      {
        kind: "contact",
        key: optionId,
        contactId: value,
        name: contact.name,
        email,
      },
    ]);
  }

  function invite(query: string): false | void {
    const email = query.toLowerCase();
    if (!isEmail(email)) {
      setError(t.emailInvalid);
      return false;
    }
    setError(null);
    if (!pickedEmails.has(email))
      setPicked((all) => [...all, { kind: "email", key: `e:${email}`, email }]);
  }

  const attendees = picked.flatMap((p) =>
    p.kind === "member" ? [p.personId] : [],
  );
  const guests = picked.flatMap(
    (p): Array<{ contactId: string } | { email: string }> =>
      p.kind === "contact"
        ? [{ contactId: p.contactId }]
        : p.kind === "email"
          ? [{ email: p.email }]
          : [],
  );

  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={`${id}-hint`}>
      <legend className="mb-1.5 text-sm font-medium">
        {t.fieldParticipants}
      </legend>
      <input type="hidden" name="attendees" value={JSON.stringify(attendees)} />
      <input type="hidden" name="guests" value={JSON.stringify(guests)} />
      <SearchPicker
        label={t.searchLabel}
        placeholder={t.searchPlaceholder}
        options={options}
        excludedIds={pickedKeys}
        suggestedIds={memberKeys}
        noSuggestionLabel={t.noSuggestion}
        onPick={pick}
        onCreate={invite}
        clearOnCreate
        createLabel={(query) =>
          isEmail(query.toLowerCase()) ? t.inviteEmail(query) : t.typeEmail
        }
        noResultLabel={t.noResult}
        allSelectedLabel={t.allPicked}
        invalid={error !== null}
        describedBy={error ? `${id}-error` : `${id}-hint`}
      />
      {error ? (
        <FieldError id={`${id}-error`}>{error}</FieldError>
      ) : (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {picked.length > 0 && (
        <ul className="mt-1 flex flex-col">
          {picked.map((person) => {
            const name = person.kind === "email" ? person.email : person.name;
            const detail =
              person.kind === "member"
                ? memberDetail
                : person.kind === "contact"
                  ? person.email
                  : t.externalDetail;
            return (
              <li
                key={person.key}
                className="flex min-h-12 items-center gap-3 border-b border-[color:var(--border-hairline)] last:border-b-0"
              >
                <Avatar name={name} pictureUrl={null} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {detail}
                  </span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t.remove(name)}
                  onClick={() =>
                    setPicked((all) => all.filter((p) => p.key !== person.key))
                  }
                >
                  <IconXmark aria-hidden />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </fieldset>
  );
}
