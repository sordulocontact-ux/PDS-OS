"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { RecordMenu } from "@/components/ui/record-menu";
import { StatusBadge } from "@/components/ui/status-badge";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import {
  disconnectGoogleAccount,
  setGoogleService,
} from "@/lib/google/connection-actions";
import type { GoogleAccountView } from "@/lib/google/connections";
import { googleConnections } from "@/lib/i18n/fr/google-connections";
import { googleServiceTone } from "@/lib/ui/state-tones";

const fr = { googleConnections };
const t = fr.googleConnections;

/**
 * One Google account in Paramètres › Connexions: its address and kind, « ⋯ »
 * Déconnecter for an account the member connected, then one line per service,
 * ticked = PDS OS reads it, with Google's answer on the right. Saved at once;
 * the page comes back with Google's new answer (revalidated by the action).
 */
export function GoogleAccountServices({
  account,
}: {
  account: GoogleAccountView;
}) {
  // Ticked as soon as clicked; back as it was if the write fails.
  const [on, setOn] = useState(
    () =>
      new Map(
        account.services.map((s) => [s.service, s.status !== "off"] as const),
      ),
  );
  const submit = useWriteSubmit(undefined, "");
  const accountId = account.id;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{account.email}</span>
          <span className="text-sm text-muted-foreground">
            {t.kinds[account.kind]}
          </span>
        </div>
        {accountId && (
          <RecordMenu
            label={account.email}
            remove={{
              label: t.disconnect.label,
              pendingLabel: t.disconnect.pending,
              title: t.disconnect.title(account.email),
              body: t.disconnect.body,
              done: t.disconnected(account.email),
              run: () => disconnectGoogleAccount(accountId),
            }}
          />
        )}
      </div>
      {account.services.map(({ service, status }) => (
        <div key={service} className="flex items-center justify-between gap-3">
          <CheckboxField
            label={t.names[service]}
            checked={on.get(service) ?? true}
            onChange={(checked) => {
              const before = on.get(service) ?? true;
              setOn((prev) => new Map(prev).set(service, checked));
              submit.run(async () => {
                const result = await setGoogleService(
                  account.email,
                  service,
                  checked,
                );
                if (!result.ok)
                  setOn((prev) => new Map(prev).set(service, before));
                return result;
              });
            }}
          />
          <StatusBadge tone={googleServiceTone[status]}>
            {t.status[status]}
          </StatusBadge>
        </div>
      ))}
      {submit.error && <FormMessage kind="error">{submit.error}</FormMessage>}
    </div>
  );
}
