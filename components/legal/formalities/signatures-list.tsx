"use client";

import { Button } from "@/components/ui/button";
import { DialogButton } from "@/components/ui/dialog-button";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { fr } from "@/lib/i18n/fr";
import type { Creator, Publisher } from "@/lib/legal/formalities/definition";
import type { FormalityView } from "@/lib/legal/formalities/types";
import { formatShortDay } from "@/lib/utils/day";

import { SignedOtherwiseForm } from "./signed-otherwise-form";

type Signature = FormalityView["signatures"][number];

/** « Le bulletin doit être signé par tous les ayants droit » (proto
 * « Projet complet », E10 step 2): each signer of the current version —
 * on their private link, where they deposit it signed, or « A signé
 * autrement » in a dialog, with the day and the signed bulletin scanned. Before the bulletin exists, who
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
            formalityId={f.id}
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
  formalityId,
  s,
  open,
}: {
  projectId: string;
  formalityId: string;
  s: Signature;
  open: boolean;
}) {
  const t = fr.legalFormalities.page;
  const r = fr.signedReturns.sacem;
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
        ) : open ? (
          // A gesture that asks for something opens a dialog (proto v3).
          <DialogButton
            label={r.signedOtherwise}
            variant="ghost"
            size="sm"
            title={r.signedOtherwise}
            description={r.otherwiseBody(s.signer)}
          >
            {(close) => (
              <SignedOtherwiseForm
                projectId={projectId}
                formalityId={formalityId}
                signatureId={s.id}
                signer={s.signer}
                onDone={close}
              />
            )}
          </DialogButton>
        ) : null
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
