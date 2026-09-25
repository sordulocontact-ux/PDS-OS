import { CircleAlertIcon, CircleCheckIcon } from "lucide-react";
import { connection } from "next/server";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { checkEnv } from "@/lib/env";
import { fr } from "@/lib/i18n/fr";
import packageJson from "@/package.json";

export default async function Home() {
  // Read the environment at request time, not at build time.
  await connection();
  const { valid, issues } = checkEnv();
  const t = fr.home;

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">{fr.app.name}</CardTitle>
          <CardDescription>
            {t.version} {packageJson.version}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <h2 className="text-sm font-medium">{t.configTitle}</h2>
          {valid ? (
            <p className="flex items-start gap-2 text-sm">
              <CircleCheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
              {t.configValid}
            </p>
          ) : (
            <div role="alert" className="space-y-2 text-sm">
              <p className="flex items-start gap-2 text-destructive">
                <CircleAlertIcon
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden
                />
                {t.configInvalid}
              </p>
              <ul className="space-y-1 pl-6">
                {issues.map(({ variable, reason }) => (
                  <li key={variable}>
                    <code className="font-mono">{variable}</code>
                    <span className="text-muted-foreground">
                      {" "}
                      — {t.issueReason[reason]}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground">{t.configHint}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
