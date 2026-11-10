import { PersonLink } from "@/components/portal/person-link";
import { FactRows } from "@/components/ui/fact-row";
import { legalFormalities } from "@/lib/i18n/fr/legal-formalities";
import { signedReturns } from "@/lib/i18n/fr/signed-returns";
import { EDITABLE } from "@/lib/legal/formalities/editable";
import {
  signatureBadge,
  signatureRole,
} from "@/lib/legal/formalities/signature-view";
import type { FormalityView } from "@/lib/legal/formalities/types";

import {
  FutureSigners,
  ReplacedVersions,
  SignatureFooter,
  SignatureRow,
} from "./signatures-list";

const fr = { legalFormalities, signedReturns };

/**
 * « Signatures », under the bulletin's card and no longer in it (Sacha,
 * 10/11/2026: « un peu comme on fait sur le master »): each signer with a
 * Réseau contact is THE link card of the app (`PersonLink`: copy,
 * « Relancer », « Nouveau lien », « Créer le lien » before one exists), its
 * pill saying the signature, how they signed under the link; PDS Éditions
 * and a signer without a contact, a line each. A change to the bulletin
 * makes them « Ne vaut plus »; the versions replaced stay folded (JUR-03).
 * Before the bulletin exists, who will sign it (UX test of 09/10/2026).
 */
export function SignaturesSection({
  projectId,
  projectTitle,
  f,
}: {
  projectId: string;
  projectTitle: string;
  f: FormalityView;
}) {
  const t = fr.legalFormalities.page;
  const r = fr.signedReturns.sacem;
  // Before the first signatures, who will sign is read above « Générer la
  // version à signer » (DossierForm) while the dossier can change.
  if (f.signatures.length === 0)
    return EDITABLE.includes(f.status) ? null : <FutureSigners f={f} />;
  const signed = f.signatures.filter(
    (s) => s.status === "signed" && !s.superseded,
  ).length;
  const latest = f.documents[0];
  const gesture = (s: FormalityView["signatures"][number]) => ({
    projectId,
    formalityId: f.id,
    s,
    open: f.status === "signatures_pending" && !s.superseded,
  });
  const row = (s: FormalityView["signatures"][number]) => (
    <FactRows key={s.id}>
      <SignatureRow {...gesture(s)} canSignHouse={f.canSignHouse} />
    </FactRows>
  );
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-medium">
        {t.signatures} · {t.version(latest?.version ?? 1)} ·{" "}
        {t.signedCount(signed, f.signatures.length)}
      </h3>
      {f.signatures.some((s) => s.superseded) && (
        <p className="text-sm text-muted-foreground">{r.supersededNote}</p>
      )}
      {f.signatures.map((s) =>
        s.house || !s.contactId ? (
          row(s)
        ) : (
          <PersonLink
            key={s.id}
            projectId={projectId}
            projectTitle={projectTitle}
            contactId={s.contactId}
            lead={signatureRole(s)}
            badge={signatureBadge(s)}
            fallback={row(s)}
          >
            <SignatureFooter {...gesture(s)} />
          </PersonLink>
        ),
      )}
      <ReplacedVersions f={f} />
    </section>
  );
}
