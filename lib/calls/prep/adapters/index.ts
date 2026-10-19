import "server-only";

import type { PreparedCallKind } from "@/lib/calls/prep/types";

import { designAdapter } from "./design";
import { framingAdapter } from "./framing";
import { masterAdapter } from "./master";
import { productionAdapter, technicalAdapter } from "./production";
import { strategyAdapter } from "./strategy";
import type { PrepAdapter } from "./types";

export const PREP_ADAPTERS: Record<PreparedCallKind, PrepAdapter> = {
  framing: framingAdapter,
  strategy: strategyAdapter,
  design: designAdapter,
  production: productionAdapter,
  technical: technicalAdapter,
  master: masterAdapter,
};
