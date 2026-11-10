"use client";

import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { DialogButton } from "@/components/ui/dialog-button";
import { FactRow } from "@/components/ui/fact-row";
import { Fold } from "@/components/ui/fold";
import { legalFormalities } from "@/lib/i18n/fr/legal-formalities";
import { signedReturns } from "@/lib/i18n/fr/signed-returns";
import {
  onBulletin,
  readCreators,
  readPublishers,
} from "@/lib/legal/formalities/participants";
import {
  signatureBadge,
  signatureHow,
  signatureRole,
  type Signature,
} from "@/lib/legal/formalities/signature-view";
import type { FormalityView } from "@/lib/legal/formalities/types";
import { signFormalityForHouse } from "@/lib/legal/signed-returns/team-actions";
import { formatShortDay } from "@/lib/utils/day";

import { SignedOtherwiseForm } from "./signed-otherwise-form";

const fr = { legalFormalities, signedReturns };

// The pieces of « Signatures », under the bulletin's card (Sacha,
// 10/11/2026: « un peu comme on fait sur le master »): each signer with a
// Réseau contact is THE link card (`PersonLink`, `SignaturesSection`), with
// what follows here under its link; PDS Éditions and a signer without a
// contact keep a line of their own.

type Gesture = {
  projectId: string;
  formalityId: string;
  s: Signature;
  // The current version, still waiting for signatures.
  open: boolean;
};

/** « A signé autrement »: the day and the signed bulletin scanned, in a
 * dialog (proto v3). */
function SignedOtherwiseButton({ projectId, formalityId, s }: Gesture) {
  const r = fr.signedReturns.sacem;
  return (
    <DialogButton
      label={r.signedOtherwise}
      variant="outline"
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
  );
}

function SignedPdf({ s }: { s: Signature }) {
  if (!s.fileUrl) return null;
  return (
    <Button
      variant="outline"
      size="sm"
      nativeButton={false}
      render={<a href={s.fileUrl} target="_blank" rel="noreferrer" />}
    >
      {fr.signedReturns.sacem.viewPdf}
    </Button>
  );
}

/** Under a signer's link: how they signed and the bulletin they gave
 * back, or « A signé autrement » while the version waits. */
export function SignatureFooter(props: Gesture) {
  const { s, open } = props;
  const how = signatureHow(s);
  const action =
    s.status === "signed" ? (
      <SignedPdf s={s} />
    ) : open ? (
      <SignedOtherwiseButton {...props} />
    ) : null;
  if (!how && !action) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[color:var(--border-hairline)] pt-3">
      <span className="text-caption text-muted-foreground">{how}</span>
      {action}
    </div>
  );
}

/** A signature without a link card: PDS Éditions, signed by the direction
 * in PDS OS (JUR-03), or a signer the Réseau does not know. */
export function SignatureRow({
  canSignHouse,
  ...props
}: Gesture & { canSignHouse: boolean }) {
  const r = fr.signedReturns.sacem;
  const { s, open } = props;
  return (
    <FactRow
      label={signatureRole(s)}
      value={<b className="font-semibold">{s.signer}</b>}
      source={
        signatureHow(s) ??
        (s.house ? r.houseWaits : s.contactId ? r.noLink : r.noContact)
      }
      state={signatureBadge(s)}
      side={
        s.status === "signed" ? (
          <SignedPdf s={s} />
        ) : open && s.house ? (
          canSignHouse && (
            <ConfirmButton
              label={r.signHouse}
              variant="outline"
              title={r.signHouse}
              body={r.signHouseBody}
              confirmLabel={r.signHouse}
              pendingLabel={r.signingHouse}
              done={r.signedHouse}
              run={() => signFormalityForHouse(props.projectId, s.id)}
            />
          )
        ) : open ? (
          <SignedOtherwiseButton {...props} />
        ) : null
      }
    />
  );
}

/** The versions a newer one replaced, with the signatures they had
 * (JUR-03), folded. */
export function ReplacedVersions({ f }: { f: FormalityView }) {
  const r = fr.signedReturns.sacem;
  if (f.replaced.length === 0) return null;
  return (
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
