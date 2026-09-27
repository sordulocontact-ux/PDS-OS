"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconMsgSmile } from "nucleo-sharp-essential";

import { navItemActiveClass, navItemClass } from "@/components/shell/nav-item";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

// "Envoyer un retour", in the user panel: opens the feedback page with the
// page it was clicked from, so the feedback says where it happened.
export function FeedbackLink() {
  const pathname = usePathname();
  const active = pathname === routes.feedback;

  return (
    <Link
      href={active ? routes.feedback : routes.feedbackFrom(pathname)}
      aria-current={active ? "page" : undefined}
      className={cn(navItemClass, active && navItemActiveClass)}
    >
      <IconMsgSmile className="size-5 shrink-0" aria-hidden />
      {fr.feedback.navLink}
    </Link>
  );
}
