"use client";

import { IconMsgSmile } from "nucleo-sharp-essential";

import { useOpenFeedback } from "@/components/feedback/feedback-provider";
import { navItemClass } from "@/components/shell/nav-item";
import { feedback } from "@/lib/i18n/fr/feedback";
import { cn } from "@/lib/utils";

const fr = { feedback };

// "Envoyer un retour", in the user panel: opens the feedback window over the
// current page, which the feedback then carries. `data-close-nav` closes the
// mobile drawer first.
export function FeedbackNavButton() {
  const open = useOpenFeedback();
  return (
    <button
      type="button"
      data-close-nav
      onClick={() => open()}
      className={cn(navItemClass, "w-full cursor-pointer text-left")}
    >
      <IconMsgSmile className="size-5 shrink-0 modern:size-4.5" aria-hidden />
      {fr.feedback.navLink}
    </button>
  );
}
