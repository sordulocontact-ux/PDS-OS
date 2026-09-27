"use client";

import type { ReactNode } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { Loaded } from "@/components/ui/loaded";
import { fr } from "@/lib/i18n/fr";

/** Body of an edit modal: loads the record, then shows its real form. */
export function EditPanel<T>({
  load,
  children,
}: {
  // null: the record is gone, archived or no longer editable.
  load: () => Promise<T | null>;
  children: (data: T) => ReactNode;
}) {
  const t = fr.records;
  return (
    <Loaded
      load={load}
      loadingLabel={t.edit.loading}
      errorLabel={t.edit.loadFailed}
    >
      {(data) =>
        data === null ? (
          <FormMessage kind="error">{t.errors.not_found}</FormMessage>
        ) : (
          children(data)
        )
      }
    </Loaded>
  );
}
