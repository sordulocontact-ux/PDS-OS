import "server-only";

import { framingVoice } from "@/lib/framing/voice";
import { masterBriefVoice } from "@/lib/master-workflow/voice";
import { strategyVoice } from "@/lib/strategy/voice";
import type { DictationResponse, VoiceStage } from "@/lib/voice/constants";
import { dictate } from "@/lib/voice/engine";

/** Routes a dictation to the adapter of its stage. Adding a stage starts here. */
export function dictateFor(
  stage: VoiceStage,
  projectId: string,
  audio: Uint8Array,
): Promise<DictationResponse<unknown>> {
  switch (stage) {
    case "framing":
      return dictate(framingVoice, projectId, audio);
    case "launch_strategy":
      return dictate(strategyVoice, projectId, audio);
    case "master_brief":
      return dictate(masterBriefVoice, projectId, audio);
  }
}
