"use client";

import { useRef, useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { sendInfluenceBrief } from "@/lib/activations/influence/brief-actions";
import type { BriefDefaults } from "@/lib/activations/influence/brief-message";
import { activationBrief } from "@/lib/i18n/fr/activation-brief";

const fr = { activationBrief };

const t = fr.activationBrief.brief;

type Ads = keyof typeof t.adsOptions;
type Missing = "fee" | "extra" | "message";

/**
 * « Brief et proposition » (proto collabCard `cbrief`): the fee, the
 * deliverables, organic and advertising rights, the message and its
 * channel in one form; « Marquer le brief comme envoyé » writes PDS's
 * proposal and the brief declared sent — PDS OS sends nothing.
 */
export function BriefProposalForm({
  projectId,
  targetId,
  defaults,
}: {
  projectId: string;
  targetId: string;
  defaults: BriefDefaults;
}) {
  const message = useRef<HTMLTextAreaElement>(null);
  const [ads, setAds] = useState<Ads>("none");
  const [missing, setMissing] = useState<Missing | null>(null);
  const { pending, error, run } = useWriteSubmit(undefined, t.done);
  return (
    <form
      noValidate
      className="flex flex-col gap-3 rounded-xl bg-[var(--surface-soft)] p-3.5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const text = (name: string) => String(data.get(name) ?? "").trim();
        const extra = text("adsExtra");
        const gap: Missing | null = !text("fee")
          ? "fee"
          : ads === "extra" && !extra
            ? "extra"
            : !text("body")
              ? "message"
              : null;
        setMissing(gap);
        if (gap) return;
        run(() =>
          sendInfluenceBrief({
            projectId,
            targetId,
            fee: text("fee"),
            deliverables: text("deliverables"),
            organic: text("organic"),
            ads: ads === "extra" ? t.adsExtraValue(extra) : t.adsOptions[ads],
            body: text("body"),
            channel: text("channel") as "email" | "dm" | "whatsapp",
          }),
        );
      }}
    >
      <h3 className="text-[length:var(--type-body-sm)] font-semibold">
        {t.title}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          name="fee"
          inputMode="decimal"
          label={t.fee}
          hint={defaults.feeSource ?? t.feeHint}
          defaultValue={defaults.fee}
          required
          error={missing === "fee" ? t.errors.fee : undefined}
        />
        <Field
          name="deliverables"
          label={t.deliverables}
          defaultValue={defaults.deliverables}
          maxLength={2000}
        />
        <Field
          name="organic"
          label={t.organic}
          defaultValue={defaults.organic}
          maxLength={1000}
        />
        <OptionSelect
          name="ads"
          label={t.ads}
          items={t.adsOptions}
          defaultValue="none"
          onValueChange={(v) => setAds(v as Ads)}
        />
        {ads === "extra" && (
          <Field
            name="adsExtra"
            inputMode="decimal"
            label={t.adsExtra}
            hint={t.feeHint}
            required
            error={missing === "extra" ? t.errors.extra : undefined}
          />
        )}
      </div>
      <TextareaField
        ref={message}
        name="body"
        label={t.message}
        rows={5}
        defaultValue={defaults.body}
        hint={t.messageSource}
        maxLength={20000}
        required
        error={missing === "message" ? t.errors.message : undefined}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <OptionSelect
          name="channel"
          label={t.channel}
          items={{
            email: t.channels.email,
            dm: t.channels.dm(defaults.platform),
            whatsapp: t.channels.whatsapp,
          }}
          defaultValue="email"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {t.send}
        </Button>
        <CopyButton
          value={() => message.current?.value ?? defaults.body}
          label={t.copy}
          copiedLabel={t.copied}
          variant="ghost"
          size="sm"
        />
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
    </form>
  );
}
