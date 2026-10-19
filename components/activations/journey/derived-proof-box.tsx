import type { DerivedProof } from "@/lib/activations/campaign";
import { fr } from "@/lib/i18n/fr";

const t = fr.activationJourney.derived;

/** « Preuves » of a campaign in house (proto derivedProofBox): what the code
 * counted, what is missing, and that no single link stands for it all. */
export function DerivedProofBox({ proof }: { proof: DerivedProof }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[color:var(--border-hairline)] bg-card p-3.5">
      <h4 className="text-[length:var(--type-body-sm)] font-semibold">
        {t.title}
      </h4>
      <p className="font-semibold">{proof.text}</p>
      {proof.missing.length > 0 && (
        <ul className="flex list-disc flex-col gap-0.5 pl-5 text-[length:var(--type-body-sm)]">
          {proof.missing.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
      <p className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]">
        {proof.kind === "influence" ? t.footInfluence : t.footPress} {t.footEnd}
      </p>
    </div>
  );
}
