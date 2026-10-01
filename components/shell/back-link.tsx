import Link from "next/link";

import { IconArrowLeft } from "@/components/icons";

// "← Tous les titres": the way back to a list, above a page's header.
export function BackLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
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
