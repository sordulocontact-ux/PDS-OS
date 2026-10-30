import Link from "next/link";

import { PdsLogo } from "@/components/shell/pds-logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { routes } from "@/lib/auth/redirects";
import { core } from "@/lib/i18n/fr/core";

const fr = { app: core.app };

// Shared frame of public and gate screens: app name, centred card, title,
// content, optional footer links.
export function AuthFrame({
  title,
  children,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <Link
          href={routes.home}
          className="flex items-center gap-2 rounded-md text-sm font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <PdsLogo entryLanding className="w-6" />
          {fr.app.name}
        </Link>

        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-lg">{title}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">{children}</CardContent>
        </Card>

        {footer && (
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground [&_a]:underline-offset-4 [&_a:hover]:text-foreground [&_a:hover]:underline">
            {footer}
          </div>
        )}
      </div>
    </main>
  );
}
