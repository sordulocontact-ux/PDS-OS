import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ContactCampaign = {
  key: string;
  href: string;
  title: string;
  projectTitle: string;
  via: "target" | "agency";
  // The outcome (target) or the PDS decision (agency row).
  state: string;
};

export type ContactObservation = {
  id: string;
  kind: "followers" | "engagement_rate" | "rate" | "category";
  platform: string | null;
  value: number | null;
  textValue: string | null;
  unit: string | null;
  observedOn: string;
  source: string;
  note: string | null;
  invalidatedAt: string | null;
  invalidationReason: string | null;
};

/**
 * A profile's history across campaigns (ticket Influence : « historique des
 * propositions et collaborations ») — targets in house and agency rows
 * linked to it, among the projects the viewer sees — and its dated
 * observations, newest first.
 */
export async function loadContactMarketing(
  contactId: string,
  hrefs: {
    target: (
      projectId: string,
      activationId: string,
      targetId: string,
    ) => string;
    activation: (projectId: string, activationId: string) => string;
  },
) {
  const supabase = await createClient();
  const [targets, rows, observations] = await Promise.all([
    supabase
      .from("activation_targets")
      .select("id, activation_id, project_id, outcome")
      .eq("contact_id", contactId),
    supabase
      .from("agency_rows")
      .select("id, activation_id, project_id, pds_decision")
      .eq("contact_id", contactId),
    supabase
      .from("network_observations")
      .select(
        "id, kind, platform, value, text_value, unit, observed_on, source, note, invalidated_at, invalidation_reason",
      )
      .eq("contact_id", contactId)
      .order("observed_on", { ascending: false }),
  ]);
  const activationIds = [
    ...new Set(
      [...(targets.data ?? []), ...(rows.data ?? [])].map(
        (r) => r.activation_id,
      ),
    ),
  ];
  const [activations, projects] = activationIds.length
    ? await Promise.all([
        supabase
          .from("marketing_activations")
          .select("id, title, project_id")
          .in("id", activationIds),
        supabase
          .from("projects")
          .select("id, title")
          .in("id", [
            ...new Set(
              [...(targets.data ?? []), ...(rows.data ?? [])].map(
                (r) => r.project_id,
              ),
            ),
          ]),
      ])
    : [{ data: [] }, { data: [] }];
  const titleOf = (id: string) =>
    activations.data?.find((a) => a.id === id)?.title ?? "—";
  const projectOf = (id: string) =>
    projects.data?.find((p) => p.id === id)?.title ?? "—";
  const campaigns: ContactCampaign[] = [
    ...(targets.data ?? []).map((t) => ({
      key: `t:${t.id}`,
      href: hrefs.target(t.project_id, t.activation_id, t.id),
      title: titleOf(t.activation_id),
      projectTitle: projectOf(t.project_id),
      via: "target" as const,
      state: t.outcome ?? "",
    })),
    ...(rows.data ?? []).map((r) => ({
      key: `a:${r.id}`,
      href: hrefs.activation(r.project_id, r.activation_id),
      title: titleOf(r.activation_id),
      projectTitle: projectOf(r.project_id),
      via: "agency" as const,
      state: r.pds_decision,
    })),
  ];
  return {
    campaigns,
    observations: (observations.data ?? []).map<ContactObservation>((o) => ({
      id: o.id,
      kind: o.kind as ContactObservation["kind"],
      platform: o.platform,
      value: o.value === null ? null : Number(o.value),
      textValue: o.text_value,
      unit: o.unit,
      observedOn: o.observed_on,
      source: o.source,
      note: o.note,
      invalidatedAt: o.invalidated_at,
      invalidationReason: o.invalidation_reason,
    })),
  };
}
