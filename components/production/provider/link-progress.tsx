"use client";

import { FormMessage } from "@/components/auth/form-message";
import { Checkbox } from "@/components/ui/checkbox";
import { fr } from "@/lib/i18n/fr";
import { setProgressByLink } from "@/lib/production/provider/journey-actions";

import { useLinkSubmit } from "./use-link-submit";

const t = fr.productionLink.progress;
const KEYS = ["calls", "gear", "crew", "schedule"] as const;

/** The company ticks what its preproduction has done. */
export function LinkProgress({
  token,
  progress,
}: {
  token: string;
  progress: Record<string, boolean>;
}) {
  const { pending, error, run } = useLinkSubmit();
  return (
    <div className="flex flex-col gap-2">
      {KEYS.map((key) => (
        <label
          key={key}
          className="flex items-center gap-3 rounded-lg bg-[var(--surface-soft)] px-3 py-2.5 text-sm"
        >
          <Checkbox
            defaultChecked={progress[key] === true}
            disabled={pending}
            onChange={(event) => {
              const done = event.currentTarget.checked;
              run(() => setProgressByLink({ token, key, done }), t.saved);
            }}
          />
          {t.items[key]}
        </label>
      ))}
      {error && <FormMessage kind="error">{error}</FormMessage>}
    </div>
  );
}
