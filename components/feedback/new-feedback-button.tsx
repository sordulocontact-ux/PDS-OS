"use client";

import { useOpenFeedback } from "@/components/feedback/feedback-provider";
import { Button } from "@/components/ui/button";
import { feedback } from "@/lib/i18n/fr/feedback";

const fr = { feedback };

// Primary action of the feedback page: the same window as everywhere else.
export function NewFeedbackButton() {
  const open = useOpenFeedback();
  return (
    <Button size="lg" onClick={() => open()}>
      {fr.feedback.newFeedback}
    </Button>
  );
}
