import Link from "next/link";

import { IconArrowLeft } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button";

// "← Tous les titres": the way back to a list, above a page's header.
// `icon`: the arrow alone, before the title of an object's page in a module
// (an activation, a deliverable: Sacha 10/11/2026); `children` is then its
// accessible name.
export function BackLink({
  href,
  icon = false,
  children,
}: {
  href: string;
  icon?: boolean;
  children: React.ReactNode;
}) {
  if (icon)
    return (
      <Link
        href={href}
        aria-label={typeof children === "string" ? children : undefined}
        className={buttonVariants({ variant: "outline", size: "icon-sm" })}
      >
        <IconArrowLeft className="size-4" aria-hidden />
        {typeof children !== "string" && children}
      </Link>
    );
  return (
    <Link
      href={href}
      className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <IconArrowLeft className="size-4" aria-hidden />
      {children}
    </Link>
  );
}
