"use client";

import { FormMessage } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { createFromLever, deferLever } from "@/lib/activations/lever-actions";
import { fr } from "@/lib/i18n/fr";

const t = fr.activationJourney.banner;

/**
 * A lever's gestures (proto ac0): the mode for Influence and RP, « Créer
 * l'activation » in one click, « Plus tard ». A lever kept for later only
 * offers « Créer ». The new activation opens on the right.
 */
export function LeverRowActions({
  projectId,
  leverId,
  withMode,
  later,
}: {
  projectId: string;
  leverId: string;
  withMode: boolean;
  later: boolean;
}) {
  const { pending, error, run } = useWriteSubmit(undefined, "");
  return (
    <form
      className="flex flex-col items-end gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const mode = withMode
          ? (String(data.get("mode") ?? "internal") as "internal" | "agency")
          : null;
        run(() => createFromLever({ projectId, leverId, mode }));
      }}
    >
      <div className="flex flex-wrap items-center justify-end gap-2">
        {withMode && (
          <div className="w-44">
            <OptionSelect
              id={`lever-mode-${leverId}`}
              name="mode"
              label={t.mode}
              hideLabel
              items={fr.activations.modes}
              defaultValue="internal"
            />
          </div>
        )}
        <Button
          type="submit"
          size="sm"
          variant={later ? "ghost" : "outline"}
          disabled={pending}
        >
          {later ? t.createShort : t.create}
        </Button>
        {!later && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => run(() => deferLever({ projectId, leverId }))}
          >
            {t.later}
          </Button>
        )}
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
    </form>
  );
}
