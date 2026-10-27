"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { DecisionPanel } from "@/components/ui/decision-panel";
import { productionCut } from "@/lib/i18n/fr/production-cut";
import { productionLight } from "@/lib/i18n/fr/production-light";
import {
  decideCutByLink,
  setFinalByLink,
} from "@/lib/production/provider/cut-link-actions";
import { depositProviderVersion } from "@/lib/production/provider/public-actions";

import { useLinkSubmit } from "./use-link-submit";

const fr = { productionLight, productionCut };

const t = fr.productionCut;
const HTTPS = /^https:\/\/\S+$/;

/** One link field and its button, on the company's link (proto plink,
 * dlink): the edit's version, or the final file. */
function LinkUrlForm({
  label,
  submit,
  missingText,
  onSend,
  done,
}: {
  label: string;
  submit: string;
  missingText: string;
  onSend: (url: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  done: string;
}) {
  const { pending, error, run } = useLinkSubmit();
  const [missing, setMissing] = useState(false);
  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const url = String(new FormData(form).get("url") ?? "").trim();
        setMissing(!HTTPS.test(url));
        if (HTTPS.test(url))
          run(
            () => onSend(url),
            done,
            () => form.reset(),
          );
      }}
    >
      <Field
        name="url"
        label={label}
        aria-required
        type="url"
        inputMode="url"
        placeholder="https://…"
        maxLength={2000}
        error={missing ? missingText : undefined}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div>
        <Button
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {submit}
        </Button>
      </div>
    </form>
  );
}

/** « Lien du montage Vn * » then « Déposer le montage Vn ». */
export function LinkCutDepositForm({
  token,
  number,
}: {
  token: string;
  number: number;
}) {
  return (
    <LinkUrlForm
      label={t.deposit.label(number)}
      submit={t.deposit.submit(number)}
      missingText={t.deposit.missing}
      done={`${t.deposit.done(number)}.`}
      onSend={async (url) => {
        const r = await depositProviderVersion({
          token,
          url,
          path: null,
          fileName: null,
          notes: "",
        });
        return r.ok ? { ok: true } : r;
      }}
    />
  );
}

/** « Déposer le fichier final du montage Vn ». */
export function LinkFinalForm({
  token,
  number,
}: {
  token: string;
  number: number;
}) {
  return (
    <LinkUrlForm
      label={t.delivery.final}
      submit={t.delivery.submit(number)}
      missingText={t.delivery.missing}
      done={`${t.delivery.done}.`}
      onSend={(url) => setFinalByLink({ token, url })}
    />
  );
}

/** « Votre retour sur le montage Vn » (the external creative validation):
 * « Valider le montage Vn » or « Demander des modifications ». */
export function LinkCutDecision({
  token,
  versionId,
  number,
  light = false,
}: {
  token: string;
  versionId: string;
  number: number;
  // A light journey's version: « Valider la Vn ».
  light?: boolean;
}) {
  const d = light ? fr.productionLight.decide : t.decide;
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-semibold">{d.title(number)}</h3>
      <DecisionPanel
        id={`cut-${versionId}`}
        title={null}
        commentLabel={d.comment}
        commentHint={light ? fr.productionLight.decide.hint : t.decide.hint}
        commentRequired={d.required}
        outcomes={[
          {
            kind: "approve",
            label: d.approve(number),
            done: `${d.approved(number)}.`,
          },
          { kind: "request_changes", label: d.changes, done: `${d.asked}.` },
        ]}
        onDecide={(kind, note) =>
          decideCutByLink({
            token,
            versionId,
            approve: kind === "approve",
            note,
          })
        }
      />
    </section>
  );
}
