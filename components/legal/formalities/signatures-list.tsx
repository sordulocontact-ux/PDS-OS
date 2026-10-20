"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { useLegalAction } from "@/components/legal/use-legal-action";
import { Button } from "@/components/ui/button";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { todayInParis } from "@/lib/contracts/types";
import { fr } from "@/lib/i18n/fr";
import type { Creator, Publisher } from "@/lib/legal/formalities/definition";
import type { FormalityView } from "@/lib/legal/formalities/types";
import { noteFormalitySignature } from "@/lib/legal/signed-returns/team-actions";
import { formatShortDay } from "@/lib/utils/day";

type Signature = FormalityView["signatures"][number];

/** « Le bulletin doit être signé par tous les ayants droit » (proto
 * « Projet complet », E10 step 2): each signer of the current version —
 * on their private link, where they deposit it signed, or « A signé
 * autrement » with the day it was signed. Before the bulletin exists, who
 * will sign it, named (UX test of 09/10/2026). */
export function SignaturesList({
  projectId,
  f,
}: {
  projectId: string;
  f: FormalityView;
}) {
  const t = fr.legalFormalities.page;
  const latest = f.documents[0];
  if (f.signatures.length === 0) return <FutureSigners f={f} />;
  const signed = f.signatures.filter((s) => s.status === "signed").length;
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-medium">
        {t.signatures} · {t.version(latest?.version ?? 1)} ·{" "}
        {t.signedCount(signed, f.signatures.length)}
      </h3>
      <FactRows>
        {f.signatures.map((s) => (
          <SignatureRow
            key={s.id}
            projectId={projectId}
            s={s}
            open={f.status === "signatures_pending"}
          />
        ))}
      </FactRows>
    </section>
  );
}

function SignatureRow({
  projectId,
  s,
  open,
}: {
  projectId: string;
  s: Signature;
  open: boolean;
}) {
  const t = fr.legalFormalities.page;
  const r = fr.signedReturns.sacem;
  const today = todayInParis(new Date());
  const [other, setOther] = useState(false);
  const [on, setOn] = useState(today);
  const [tried, setTried] = useState(false);
  const { pending, run } = useLegalAction();
  const role =
    s.role === "publisher"
      ? t.publisherRole
      : (fr.legalFormalities.qualities[
          s.role as keyof typeof fr.legalFormalities.qualities
        ] ?? s.role);
  const day = (value: string | null) =>
    value ? formatShortDay(value, { bare: true }) : "";
  const source =
    s.status === "signed"
      ? s.via === "link"
        ? r.byLink(day(s.signedOn ?? s.at))
        : s.via === "other"
          ? r.otherwise(day(s.signedOn))
          : (s.proof ?? t.signed(day(s.at)))
      : s.onLink
        ? r.onLink
        : s.role === "publisher"
          ? null
          : r.noLink;
  const missing = tried && (!on || on > today) ? r.signedOnMissing : undefined;
  return (
    <FactRow
      label={role}
      value={<b className="font-semibold">{s.signer}</b>}
      source={source}
      state={
        s.status === "signed"
          ? { tone: "success", label: fr.signedReturns.portal.signedBadge }
          : { tone: "warning", label: r.pending }
      }
      side={
        s.status === "signed" ? (
          s.fileUrl && (
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<a href={s.fileUrl} target="_blank" rel="noreferrer" />}
            >
              {r.viewPdf}
            </Button>
          )
        ) : open && !other ? (
          <Button variant="ghost" size="sm" onClick={() => setOther(true)}>
            {r.signedOtherwise}
          </Button>
        ) : null
      }
      below={
        s.status === "pending" &&
        open &&
        other && (
          <form
            noValidate
            className="flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setTried(true);
              if (!on || on > today) return;
              run(
                () => noteFormalitySignature(projectId, s.id, on),
                undefined,
                r.noted(s.signer),
              );
            }}
          >
            <Field
              name={`${s.id}-signed-on`}
              type="date"
              label={r.signedOn}
              hint={r.signedOnHint}
              aria-required
              max={today}
              value={on}
              error={missing}
              onChange={(event) => setOn(event.target.value)}
              className="h-10 w-fit"
            />
            <Button type="submit" size="sm" disabled={pending}>
              {r.note}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOther(false)}
            >
              {fr.signedReturns.team.cancel}
            </Button>
          </form>
        )
      }
    />
  );
}

// The signers the saved dossier names: creators who sign, then publishers.
function FutureSigners({ f }: { f: FormalityView }) {
  const t = fr.legalFormalities;
  const creators = Array.isArray(f.values.creators?.value)
    ? (f.values.creators.value as Creator[])
    : [];
  const publishers = Array.isArray(f.values.publishers?.value)
    ? (f.values.publishers.value as Publisher[])
    : [];
  const signers = [
    ...creators
      .filter((c) => c.signs)
      .map((c) => {
        const civil = [c.first_name, c.last_name].filter(Boolean).join(" ");
        return {
          name:
            c.pseudonym && civil && c.pseudonym !== civil
              ? `${c.pseudonym} (${civil})`
              : c.pseudonym || civil,
          role: c.quality ? t.qualities[c.quality] : "",
        };
      }),
    ...publishers.map((p) => ({ name: p.name, role: t.page.publisherRole })),
  ].filter((s) => s.name.trim());
  if (signers.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <h3 className="font-medium">{t.page.willSign}</h3>
        <p className="text-sm text-muted-foreground">{t.page.willSignHint}</p>
      </div>
      <ul className="flex flex-col divide-y">
        {signers.map((s, i) => (
          <li key={`${s.name}-${i}`} className="py-2 break-words">
            {s.name}
            {s.role && (
              <span className="block text-sm text-muted-foreground">
                {s.role}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
