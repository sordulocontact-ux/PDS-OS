// The Distribution's history in words (ticket « Distribution » § 10, CA17),
// from the events the database wrote (distribution_events). Pure.

import { isCheckKey, isCheckResult } from "@/lib/distribution/checks";
import { ANOMALY_KINDS, ANOMALY_STATES } from "@/lib/distribution/anomalies";
import { isClosureKind } from "@/lib/distribution/closure";
import { platformLabel } from "@/lib/distribution/platforms";
import {
  DEROGATION_SCOPES,
  isRefusalModule,
} from "@/lib/distribution/validation";
import { isDeclarationKind } from "@/lib/distribution/tracking";
import { distribution } from "@/lib/i18n/fr/distribution";
import { distributionJourney } from "@/lib/i18n/fr/distribution-journey";

const fr = { distribution, distributionJourney };

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
    typeof data.kind === "string" && isClosureKind(data.kind)
      ? d.closure.kinds[data.kind]
      : d.closure.kinds.reserves;
  const strings = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.filter((x): x is string => typeof x === "string")
      : [];
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
    case "dossier.parameters_confirmed":
      return { text: t.parametersConfirmed, note: null };
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
      return {
        text: data.derogation
          ? t.submittedDerogated(num(data.number))
          : t.submitted(num(data.number)),
        note: null,
      };
    case "version.approved":
      return { text: t.approved(num(data.number)), note };
    case "version.rejected": {
      const modules = strings(data.modules).filter(isRefusalModule);
      return {
        text: modules.length
          ? t.rejectedModules(
              num(data.number),
              modules.map((m) => d.anomalies.modules[m]).join(", "),
            )
          : t.rejected(num(data.number)),
        note,
      };
    }
    case "checks.reset":
      return {
        text: t.checksReset(
          strings(data.keys)
            .filter(isCheckKey)
            .map((k) => d.checks.items[k].label)
            .join(", "),
          str(data.reason) ?? "",
        ),
        note: null,
      };
    case "derogation.granted":
      return {
        text: t.derogationGranted(
          strings(data.scope)
            .filter((s): s is (typeof DEROGATION_SCOPES)[number] =>
              (DEROGATION_SCOPES as readonly string[]).includes(s),
            )
            .map((s) =>
              fr.distributionJourney.derogation.scopes[s].toLowerCase(),
            )
            .join(", "),
          str(data.due_on) ?? "",
        ),
        note: str(data.reason),
      };
    case "derogation.revoked":
      return { text: t.derogationRevoked, note: null };
    case "reserve.lift_requested":
      return {
        text: t.reserveLiftRequested(str(data.label) ?? ""),
        note: null,
      };
    case "reserve.lifted":
      return { text: t.reserveLifted(str(data.label) ?? ""), note: null };
    case "reserve.lift_refused":
      return { text: t.reserveLiftRefused(str(data.label) ?? ""), note };
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
    case "declaration.proof_added": {
      const what = str(data.kind);
      return {
        text: t.proofAdded(
          what && isDeclarationKind(what) ? d.tracking.kindTitles[what] : "",
        ),
        note: null,
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
