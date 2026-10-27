"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { DialogButton } from "@/components/ui/dialog-button";
import { Loaded } from "@/components/ui/loaded";
import { masterPage } from "@/lib/i18n/fr/master-page";
import { network } from "@/lib/i18n/fr/network";
import {
  attachSession,
  listAttachableSessions,
  type AttachableSession,
} from "@/lib/catalog/master/session-actions";

const fr = { network, masterPage };

/**
 * « Rattacher une session » (retour 27): an existing session of the
 * Catalogue, with the titles it already serves, linked to this title
 * instead of being typed again.
 */
export function AttachSessionButton({ masterId }: { masterId: string }) {
  const t = fr.masterPage.sessions;
  return (
    <DialogButton
      label={t.attach}
      title={t.attachTitle}
      description={t.attachDescription}
    >
      {(close) => (
        <Loaded
          load={() => listAttachableSessions(masterId)}
          loadingLabel={fr.network.picker.loading}
          errorLabel={t.errors.failed}
        >
          {(sessions) => (
            <AttachList
              masterId={masterId}
              sessions={sessions}
              onDone={close}
            />
          )}
        </Loaded>
      )}
    </DialogButton>
  );
}

function AttachList({
  masterId,
  sessions,
  onDone,
}: {
  masterId: string;
  sessions: AttachableSession[];
  onDone: () => void;
}) {
  const t = fr.masterPage.sessions;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (sessions.length === 0)
    return (
      <p className="text-body-md text-muted-foreground">{t.attachEmpty}</p>
    );
  return (
    <div className="flex flex-col gap-3">
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <ul className="flex flex-col divide-y">
        {sessions.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between gap-3 py-2.5"
          >
            <span className="flex min-w-0 flex-col">
              <span className="font-medium break-words">{s.label}</span>
              {s.titles.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {t.onTitles(s.titles.join(", "))}
                </span>
              )}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await attachSession(masterId, s.id);
                  if (!result.ok) return setError(result.error);
                  toast.success(t.attached);
                  onDone();
                })
              }
            >
              {t.attachAction}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
