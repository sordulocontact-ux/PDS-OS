// The Distribution's history in words (ticket « Distribution » § 10, CA17),
// from the events the database wrote (distribution_events). Pure.

import { isCheckKey, isCheckResult } from "@/lib/distribution/checks";
import { ANOMALY_KINDS, ANOMALY_STATES } from "@/lib/distribution/anomalies";
import { platformLabel } from "@/lib/distribution/platforms";
import { isDeclarationKind } from "@/lib/distribution/tracking";
import { fr } from "@/lib/i18n/fr";

const str = (value: unknown): string | null =>
  typeof value === "string" ? value : null;
const num = (value: unknown): number => (typeof value === "number" ? value : 0);

const oneOf = <T extends string>(values: readonly T[], value: unknown) =>
  typeof value === "string" && (values as readonly string[]).includes(value)
    ? (value as T)
    : null;

// A saved column of distribution_dossiers, as the form names it.
function paramLabel(column: string): string | null {
  const f = fr.distribution.dossier.fields;
  switch (column) {
    case "territory_mode":
    case "territories":
      return f.territories;
    case "preorder":
    case "preorder_on":
      return f.preorder;
    case "prelisten":
    case "prelisten_on":
      return f.prelisten;
    case "price_tier":
      return f.priceTier;
    case "notes":
      return f.notes;
    case "cover_sheet_id":
      return f.cover;
    default:
      return null;
  }
}

/** One event as a sentence, and the note it carries, if any. */
export function eventText(
  kind: string,
  data: Record<string, unknown>,
): { text: string; note: string | null } {
  const t = fr.distribution.history.events;
  const d = fr.distribution;
  const note = str(data.note);
  const closureKind =
    data.kind === "normal" ? d.closure.kinds.normal : d.closure.kinds.reserves;
  const platform = str(data.platform);
  const platformName = platform ? platformLabel({ platform, label: null }) : "";
  switch (kind) {
    case "dossier.parameters_saved": {
      const changed = Array.isArray(data.changed)
        ? data.changed.filter((key): key is string => typeof key === "string")
        : [];
      const labels = [
        ...new Set(
          changed.map(paramLabel).filter((label): label is string => !!label),
        ),
      ];
      return {
        text: t.parameters(labels.join(", ").toLocaleLowerCase("fr")),
        note: null,
      };
    }
    case "validator.set":
      return {
        text: data.person_id ? t.validatorSet : t.validatorCleared,
        note: null,
      };
    case "check.recorded": {
      const key = str(data.key);
      const result = str(data.result);
      return {
        text:
          key && result && isCheckKey(key) && isCheckResult(result)
            ? t.check(d.checks.items[key].label, d.checks.results[result])
            : t.other(kind),
        note,
      };
    }
    case "version.submitted":
      return { text: t.submitted(num(data.number)), note: null };
    case "version.approved":
      return { text: t.approved(num(data.number)), note };
    case "version.rejected":
      return { text: t.rejected(num(data.number)), note };
    case "version.superseded":
      return { text: t.superseded(num(data.number)), note };
    case "declaration.withdrawn": {
      const what = str(data.kind);
      return {
        text: t.withdrawn(
          what && isDeclarationKind(what) ? d.tracking.kindTitles[what] : "",
        ),
        note,
      };
    }
    case "platform.saved":
      return { text: t.platformSaved(platformName), note: null };
    case "platform.verified": {
      const seen = oneOf(
        ["unchecked", "verified", "unavailable"] as const,
        data.verification,
      );
      const match = oneOf(
        ["unchecked", "compliant", "non_compliant"] as const,
        data.compliance,
      );
      return {
        text: t.platformVerified(
          platformName,
          seen ? d.platforms.verifications[seen] : "",
          match ? d.platforms.compliances[match] : "",
        ),
        note: null,
      };
    }
    case "anomaly.reported": {
      const anomaly = oneOf(ANOMALY_KINDS, data.kind);
      return {
        text: t.anomaly(anomaly ? d.anomalies.kinds[anomaly] : ""),
        note: null,
      };
    }
    case "anomaly.state": {
      const state = oneOf(ANOMALY_STATES, data.to);
      return {
        text: t.anomalyState(state ? d.anomalies.states[state] : ""),
        note,
      };
    }
    case "closure.proposed":
      return { text: t.closureProposed(closureKind), note: null };
    case "closure.closed":
      return { text: t.closureClosed(closureKind), note };
    case "closure.rejected":
      return { text: t.closureRejected(closureKind), note };
    case "closure.reopened":
      return { text: t.closureReopened, note };
  }
  if (kind.startsWith("declaration.")) {
    const what = kind.slice("declaration.".length);
    return {
      text: isDeclarationKind(what)
        ? t.declaration(d.tracking.kindTitles[what], data.proof === true)
        : t.other(kind),
      note: null,
    };
  }
  return { text: t.other(kind), note };
}
