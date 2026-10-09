// The eight dimensions of the Strategy (ticket « Stratégie · Finalisation du
// workflow », § 2), in the order of the pilot list. Labels live in
// lib/i18n/fr/strategy-flow.ts. Client-safe.

export const STRATEGY_DIMENSIONS = [
  "positioning",
  "audiences",
  "narrative",
  "setup",
  "deliverables",
  "calendar",
  "budget",
  "objectives",
] as const;
export type StrategyDimension = (typeof STRATEGY_DIMENSIONS)[number];

export function isStrategyDimension(
  value: unknown,
): value is StrategyDimension {
  return (
    typeof value === "string" &&
    (STRATEGY_DIMENSIONS as readonly string[]).includes(value)
  );
}

// À compléter · En cours · À arbitrer · Complété: decided by code
// (lib/strategy/assess.ts), never by PO.
export const DIMENSION_STATES = [
  "todo",
  "in_progress",
  "to_decide",
  "done",
] as const;
export type DimensionState = (typeof DIMENSION_STATES)[number];

// Calendar channels (milestones.channel), in the order of the channel view.
export const CHANNELS = [
  "organic",
  "influence",
  "press",
  "release",
  "live",
  "other",
] as const;
export type Channel = (typeof CHANNELS)[number];

export function isChannel(value: unknown): value is Channel {
  return (
    typeof value === "string" && (CHANNELS as readonly string[]).includes(value)
  );
}

// Common levers offered in one click (Dispositif); the label stays editable
// and any other lever can be added. Keys map to fr.strategyFlow.setup.presets.
export const LEVER_PRESETS = {
  organic: "promotion_distribution",
  influence: "promotion_distribution",
  press: "promotion_distribution",
  playlists: "promotion_distribution",
  partnerships: "experiences_activations",
} as const;
export type LeverPreset = keyof typeof LEVER_PRESETS;

export const KPI_METRICS = ["manual", "deezer_fans"] as const;
export type KpiMetric = (typeof KPI_METRICS)[number];
