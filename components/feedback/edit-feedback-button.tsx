"use client";

import { IconPenWriting2 } from "nucleo-sharp-essential";

import { useOpenFeedback } from "@/components/feedback/feedback-provider";
import { Button } from "@/components/ui/button";
import type { EditedFeedback } from "@/lib/feedback/types";
import { fr } from "@/lib/i18n/fr";

// "Modifier" on the author's own feedback: the feedback window opens on it,
// to add a detail or a screenshot.
export function EditFeedbackButton({
  feedback,
  label,
}: {
  feedback: EditedFeedback;
  // Names the feedback for screen readers: "Modifier le retour du …".
  label: string;
}) {
  const open = useOpenFeedback();
  return (
    <Button
      variant="outline"
      size="sm"
      aria-label={label}
      onClick={() => open({ editing: feedback })}
    >
      <IconPenWriting2 aria-hidden data-icon="inline-start" />
      {fr.feedback.mineEdit.action}
    </Button>
  );
}
