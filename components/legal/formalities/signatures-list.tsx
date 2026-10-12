"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { useLegalAction } from "@/components/legal/use-legal-action";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import type { Creator, Publisher } from "@/lib/legal/formalities/definition";
import { signFormality } from "@/lib/legal/formalities/step-actions";
import type { FormalityView } from "@/lib/legal/formalities/types";
import { formatInstant } from "@/lib/utils/instant";

/** « Le bulletin doit être signé par tous les ayants droit » : each signer
 * of the current version, recorded signed with its proof; before the
 * bulletin exists, who will sign it, named (UX test of 09/10/2026). */
export function SignaturesList({
  projectId,
  f,
}: {
  projectId: string;
  f: FormalityView;
}) {
  const t = fr.legalFormalities.page;
  const [proofs, setProofs] = useState<Record<string, string>>({});
  // A signature tried without its proof: said under its field.
  const [tried, setTried] = useState<Record<string, boolean>>({});
  const { pending, run } = useLegalAction();
  const latest = f.documents[0];
  if (f.signatures.length === 0) return <FutureSigners f={f} />;
  const signed = f.signatures.filter((s) => s.status === "signed").length;
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-medium">
        {t.signatures} · {t.version(latest?.version ?? 1)} ·{" "}
        {t.signedCount(signed, f.signatures.length)}
      </h3>
      <ul className="flex flex-col divide-y">
        {f.signatures.map((s) => (
          <li
            key={s.id}
            className="flex flex-col gap-2 py-2 sm:flex-row sm:items-end sm:justify-between"
          >
            <span className="min-w-0 break-words">
              {s.signer}
              <span className="block text-sm text-muted-foreground">
                {s.role === "publisher"
                  ? t.publisherRole
                  : (fr.legalFormalities.qualities[
                      s.role as keyof typeof fr.legalFormalities.qualities
                    ] ?? s.role)}
                {s.at && ` · ${t.signed(formatInstant(s.at))}`}
              </span>
            </span>
            {s.status === "signed" ? (
              <StatusBadge tone="success" size="sm">
                {t.signed(s.at ? formatInstant(s.at) : "")}
              </StatusBadge>
            ) : (
              f.status === "signatures_pending" && (
                <span className="flex flex-wrap items-end gap-2">
                  <Field
                    name={`${s.id}-proof`}
                    label={t.signProof(s.signer)}
                    hint={t.signProofHint}
                    required
                    value={proofs[s.id] ?? ""}
                    error={
                      tried[s.id] && !(proofs[s.id] ?? "").trim()
                        ? t.signProofMissing
                        : undefined
                    }
                    onChange={(e) =>
                      setProofs((p) => ({ ...p, [s.id]: e.target.value }))
                    }
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => {
                      setTried((x) => ({ ...x, [s.id]: true }));
                      if (!(proofs[s.id] ?? "").trim()) return;
                      run(
                        () =>
                          signFormality(projectId, s.id, proofs[s.id] ?? ""),
                        undefined,
                        fr.legalFormalities.transitions.signed(s.signer),
                      );
                    }}
                  >
                    {t.sign(s.signer)}
                  </Button>
                </span>
              )
            )}
          </li>
        ))}
      </ul>
    </section>
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
