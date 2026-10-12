import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import { SACEM_725_FIELDS } from "@/lib/legal/formalities/definition";

type Entry = { value: unknown; typed: boolean };
type RecapState = "confirmed" | "proposed" | "toVerify" | "missing" | "empty";

// A value is there when it says something: text, a non-empty list, a choice.
function filled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object")
    return Object.values(value as Record<string, unknown>).some(
      (v) => v !== "" && v !== null && v !== false,
    );
  return true;
}

/**
 * The last step of the SACEM dossier (JUR-21): every field of the bulletin
 * as it stands — confirmed (typed or validated), proposed from a source
 * and still to check, or missing — before « Valider le dossier ».
 */
export function DossierRecap({
  entries,
  toVerify,
}: {
  entries: Record<string, Entry>;
  // Fields the SACEM reopened.
  toVerify: ReadonlySet<string>;
}) {
  const t = fr.legalFormalities;
  const r = t.recap;
  const rows = SACEM_725_FIELDS.filter((f) => f.kind !== "publishers").map(
    (field) => {
      const entry = entries[field.key];
      const state: RecapState = toVerify.has(field.key)
        ? "toVerify"
        : !entry || !filled(entry.value)
          ? field.required
            ? "missing"
            : "empty"
          : entry.typed
            ? "confirmed"
            : "proposed";
      return { key: field.key, label: t.fields[field.key], state };
    },
  );
  const tone = {
    confirmed: "success",
    proposed: "warning",
    toVerify: "warning",
    missing: "danger",
    empty: "neutral",
  } as const;
  return (
    <section className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{r.body}</p>
      <ul className="flex flex-col divide-y">
        {rows.map((row) => (
          <li
            key={row.key}
            className="flex items-center justify-between gap-3 py-2"
          >
            <span className="min-w-0 break-words">{row.label}</span>
            <StatusBadge tone={tone[row.state]} size="sm">
              {r.states[row.state]}
            </StatusBadge>
          </li>
        ))}
      </ul>
    </section>
  );
}
