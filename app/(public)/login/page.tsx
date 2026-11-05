import Link from "next/link";
import { AuthFrame } from "@/components/auth/auth-frame";
import { requireAnonymous } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { LoginForm } from "./login-form";

export const metadata = { title: `${fr.auth.login.title} · ${fr.app.name}` };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAnonymous();
  const params = await searchParams;
  const linkInvalid = params.error === "link_invalid";
  // Checked again by the sign-in action (safeReturnPath).
  const next = typeof params.next === "string" ? params.next : undefined;

  return (
    <AuthFrame
      title={fr.auth.login.title}
      footer={
        <>
          <Link href={routes.forgotPassword}>{fr.auth.login.forgot}</Link>
          <Link href={routes.signup}>{fr.auth.login.noAccount}</Link>
        </>
      }
    >
      <LoginForm
        initialError={linkInvalid ? fr.auth.errors.linkInvalid : undefined}
        next={next}
      />
    </AuthFrame>
  );
}
