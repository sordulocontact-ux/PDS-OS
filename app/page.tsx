import { IconCircleXmark } from "@/components/icons";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { AuthFrame } from "@/components/auth/auth-frame";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAccess } from "@/lib/auth/dal";
import { destinationFor, routes } from "@/lib/auth/redirects";
import { checkEnv, type EnvIssue } from "@/lib/env";
import { fr } from "@/lib/i18n/fr";
import packageJson from "@/package.json";

// Email links that fell back to the site URL (redirect not allow-listed)
// land here: hand them to the confirmation route.
const AUTH_LINK_PARAMS = ["token_hash", "type", "code"] as const;

export default async function Home({ searchParams }: PageProps<"/">) {
  // Read the environment at request time, not at build time.
  await connection();
  const { valid, issues } = checkEnv();
  if (!valid) return <ConfigCheck issues={issues} />;

  const params = await searchParams;
  if (
    typeof params.token_hash === "string" ||
    typeof params.code === "string"
  ) {
    const query = new URLSearchParams();
    for (const key of AUTH_LINK_PARAMS) {
      const value = params[key];
      if (typeof value === "string") query.set(key, value);
    }
    redirect(`${routes.authConfirm}?${query.toString()}`);
  }

  const access = await getAccess();
  if (access.state !== "anonymous") redirect(destinationFor(access.state));

  const t = fr.auth;
  return (
    <AuthFrame title={t.entry.title}>
      <p className="text-sm text-muted-foreground">{t.entry.body}</p>
      <div className="flex flex-col gap-2">
        <Link href={routes.login} className={buttonVariants({ size: "lg" })}>
          {t.common.signIn}
        </Link>
        <Link
          href={routes.signup}
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          {t.common.signUp}
        </Link>
      </div>
    </AuthFrame>
  );
}

// Shown only when the configuration is invalid: variable names, never values.
function ConfigCheck({ issues }: { issues: EnvIssue[] }) {
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
          <div role="alert" className="space-y-2 text-sm">
            <p className="flex items-start gap-2 text-error">
              <IconCircleXmark className="mt-0.5 size-4 shrink-0" aria-hidden />
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
        </CardContent>
      </Card>
    </main>
  );
}
