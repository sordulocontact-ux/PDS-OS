"use client";

import { saveSession } from "@/lib/catalog/master/item-actions";
import type { MasterSession } from "@/lib/catalog/master/rules";

import { MasterForm } from "./master-form";
import { SessionFields } from "./session-fields";

export function SessionForm({
  masterId,
  session,
  defaults,
  onDone,
  onCancel,
}: {
  masterId: string;
  session: MasterSession | null;
  // Values proposed by PO, by field name.
  defaults?: Record<string, string>;
  onDone: () => void;
  onCancel?: () => void;
}) {
  return (
    <MasterForm
      action={saveSession}
      defaults={defaults}
      hidden={{ masterId, itemId: session?.id }}
      onDone={onDone}
      onCancel={onCancel}
    >
      {({ value, error }) => (
        <SessionFields
          masterId={masterId}
          session={session}
          defaultKind={defaults?.kind}
          defaultStatus="done"
          value={value}
          error={error}
        />
      )}
    </MasterForm>
  );
}
