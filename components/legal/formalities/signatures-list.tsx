"use client";

import { EDITABLE } from "@/components/legal/formalities/dossier-form";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { DialogButton } from "@/components/ui/dialog-button";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { Fold } from "@/components/ui/fold";
import { legalFormalities } from "@/lib/i18n/fr/legal-formalities";
import { signedReturns } from "@/lib/i18n/fr/signed-returns";
import {
  onBulletin,
  readCreators,
  readPublishers,
} from "@/lib/legal/formalities/participants";
import type { FormalityView } from "@/lib/legal/formalities/types";
import { signFormalityForHouse } from "@/lib/legal/signed-returns/team-actions";
import { formatShortDay } from "@/lib/utils/day";

import { SignedOtherwiseForm } from "./signed-otherwise-form";

const fr = { legalFormalities, signedReturns };

type Signature = FormalityView["signatures"][number];

/** « Le bulletin doit être signé par tous les ayants droit » (proto
 * « Projet complet », E10 step 2): each signer of the current version —
 * on their private link, where they deposit it signed, or « A signé
 * autrement » in a dialog, with the day and the signed bulletin scanned;
 * PDS Éditions by the direction, in PDS OS. A change to the bulletin makes
 * them « Ne vaut plus », and the versions replaced stay folded below, with
 * the signatures they had (JUR-03). Before the bulletin exists, who will
 * sign it, named (UX test of 09/10/2026). */
export function SignaturesList({
  projectId,
  f,
}: {
  projectId: string;
  f: FormalityView;
}) {
  const t = fr.legalFormalities.page;
  const r = fr.signedReturns.sacem;
  const latest = f.documents[0];
  // Before the first signatures, who will sign is read above « Générer la
  // version à signer » (DossierForm) while the dossier can change.
  if (f.signatures.length === 0)
    return EDITABLE.includes(f.status) ? null : <FutureSigners f={f} />;
  const signed = f.signatures.filter(
    (s) => s.status === "signed" && !s.superseded,
  ).length;
  const superseded = f.signatures.some((s) => s.superseded);
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-medium">
        {t.signatures} · {t.version(latest?.version ?? 1)} ·{" "}
        {t.signedCount(signed, f.signatures.length)}
      </h3>
      {superseded && (
        <p className="text-sm text-muted-foreground">{r.supersededNote}</p>
      )}
      <FactRows>
        {f.signatures.map((s) => (
          <SignatureRow
            key={s.id}
            projectId={projectId}
            formalityId={f.id}
            s={s}
            open={f.status === "signatures_pending" && !s.superseded}
            canSignHouse={f.canSignHouse}
          />
        ))}
      </FactRows>
      {f.replaced.length > 0 && (
        <Fold summary={r.replaced}>
          <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
            {f.replaced.map((v) => (
              <li key={v.version} className="break-words">
                {r.replacedLine(
                  v.version,
                  v.at ? formatShortDay(v.at, { bare: true }) : "",
                  v.signers.filter((x) => x.signed).length,
                )}
                {v.signers.some((x) => x.signed) &&
                  ` : ${v.signers
                    .filter((x) => x.signed)
                    .map((x) => x.signer)
                    .join(", ")}`}
              </li>
            ))}
          </ul>
        </Fold>
      )}
    </section>
  );
}

function SignatureRow({
  projectId,
  formalityId,
  s,
  open,
  canSignHouse,
}: {
  projectId: string;
  formalityId: string;
  s: Signature;
  open: boolean;
  canSignHouse: boolean;
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
          : s.via === "house"
            ? r.byHouse(day(s.signedOn ?? s.at))
            : (s.proof ?? t.signed(day(s.at)))
      : s.house
        ? r.houseWaits
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
        s.superseded
          ? { tone: "neutral", label: r.superseded }
          : s.status === "signed"
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
        ) : open && s.house ? (
          // PDS Éditions: the direction signs here, nobody else (JUR-03).
          canSignHouse && (
            <ConfirmButton
              label={r.signHouse}
              variant="outline"
              title={r.signHouse}
              body={r.signHouseBody}
              confirmLabel={r.signHouse}
              pendingLabel={r.signingHouse}
              done={r.signedHouse}
              run={() => signFormalityForHouse(projectId, s.id)}
            />
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
export function FutureSigners({ f }: { f: FormalityView }) {
  const t = fr.legalFormalities;
  const creators = readCreators(f.values.creators?.value);
  const publishers = readPublishers(f.values.publishers?.value);
  const signers = [
    ...creators
      .filter((c) => c.signs && onBulletin(c))
      .map((c) => {
        const civil = [c.first_name, c.last_name].filter(Boolean).join(" ");
        return {
          name:
            c.pseudonym && civil && c.pseudonym !== civil
              ? `${c.pseudonym} (${civil})`
              : c.pseudonym || civil,
          role: c.roles.map((r) => t.qualities[r]).join(", "),
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
