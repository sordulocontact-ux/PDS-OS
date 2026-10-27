"use client";

import { FormMessage } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { declareAgreementSent } from "@/lib/activations/influence/negotiation-actions";
import { fr } from "@/lib/i18n/fr";

const t = fr.activationInfluence.agreement;
type Channel = keyof typeof t.channels;

/**
 * « Envoyer l'accord » from the owner's view (recette of 23/10, MKT-INF-002):
 * to whom, by which channel, then « Marquer comme envoyé » — the state
 * changes only then. PDS OS sends nothing itself: the link shown at its
 * creation leaves by the person's own e-mail or message.
 */
export function AgreementSendForm({
  projectId,
  agreementId,
  to,
}: {
  projectId: string;
  agreementId: string;
  // « À : Léa · lea@… ».
  to: string;
}) {
  const { pending, error, run } = useWriteSubmit(undefined, t.marked);
  return (
    <form
      noValidate
      className="flex flex-col gap-3 rounded-xl bg-[var(--surface-soft)] p-3.5"
      onSubmit={(event) => {
        event.preventDefault();
        const channel = String(
          new FormData(event.currentTarget).get("channel") ?? "email",
        ) as Channel;
        run(() =>
          declareAgreementSent({ projectId, id: agreementId, channel }),
        );
      }}
    >
      <b className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] font-semibold">
        {t.sendTitle}
      </b>
      <span className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)]">
        {to}
      </span>
      <OptionSelect
        name="channel"
        label={t.channel}
        items={t.channels}
        defaultValue="email"
        hint={t.sendHint}
      />
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {t.markSent}
        </Button>
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
    </form>
  );
}
