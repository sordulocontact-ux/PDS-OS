import Link from "next/link";
import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Frame shared by the home cards: a title, an optional link, a short list or an empty line. */
export function HomeCard({
  title,
  action,
  empty,
  children,
}: {
  title: string;
  action?: { label: string; href: string };
  empty?: string;
  children?: ReactNode;
}) {
  return (
    <Card size="sm">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        {action && (
          <Link
            href={action.href}
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            {action.label}
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {empty ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

/** One line of a card: main text linked to its page, secondary text below. */
export function CardRow({
  href,
  main,
  sub,
  badge,
}: {
  href: string;
  main: string;
  sub?: string;
  badge?: ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="-mx-2 flex items-start justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-muted"
      >
        <span className="grid min-w-0">
          <span className="truncate text-sm font-medium">{main}</span>
          {sub && (
            <span className="truncate text-xs text-muted-foreground">
              {sub}
            </span>
          )}
        </span>
        {badge}
      </Link>
    </li>
  );
}
