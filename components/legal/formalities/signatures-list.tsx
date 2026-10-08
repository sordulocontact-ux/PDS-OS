"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { useLegalAction } from "@/components/legal/use-legal-action";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import { signFormality } from "@/lib/legal/formalities/step-actions";
import type { FormalityView } from "@/lib/legal/formalities/types";
import { formatDate } from "@/lib/release/format";

/** « Le bulletin doit être signé par tous les ayants droit » : each signer
 * of the current version, recorded signed with its proof. */
export function SignaturesList({
  projectId,
  f,
}: {
  projectId: string;
  f: FormalityView;
}) {
  const t = fr.legalFormalities.page;
  const [proofs, setProofs] = useState<Record<string, string>>({});
  const { pending, run } = useLegalAction();
  const latest = f.documents[0];
  if (f.signatures.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-medium">
        {t.signatures} · {t.version(latest?.version ?? 1)}
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
                  ? fr.legalFormalities.publisher.name
                  : (fr.legalFormalities.qualities[
                      s.role as keyof typeof fr.legalFormalities.qualities
                    ] ?? s.role)}
                {s.at && ` · ${t.signed(formatDate(s.at))}`}
              </span>
            </span>
            {s.status === "signed" ? (
              <StatusBadge tone="success" size="sm">
                {t.signed(formatDate(s.at ?? ""))}
              </StatusBadge>
            ) : (
              f.status === "signatures_pending" && (
                <span className="flex flex-wrap items-end gap-2">
                  <Field
                    name={`${s.id}-proof`}
                    label={t.signProof}
                    aria-required
                    value={proofs[s.id] ?? ""}
                    onChange={(e) =>
                      setProofs((p) => ({ ...p, [s.id]: e.target.value }))
                    }
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending || !(proofs[s.id] ?? "").trim()}
                    onClick={() =>
                      run(() =>
                        signFormality(projectId, s.id, proofs[s.id] ?? ""),
                      )
                    }
                  >
                    {t.sign}
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
