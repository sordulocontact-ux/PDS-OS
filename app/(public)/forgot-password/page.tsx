import Link from "next/link";
import { AuthFrame } from "@/components/auth/auth-frame";
import { requireAnonymous } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata = {
  title: `${fr.auth.forgotPassword.title} · ${fr.app.name}`,
};

export default async function ForgotPasswordPage() {
  await requireAnonymous();

  return (
    <AuthFrame
      title={fr.auth.forgotPassword.title}
      footer={
        <Link href={routes.login}>{fr.auth.forgotPassword.backToLogin}</Link>
      }
    >
      <p className="text-sm text-muted-foreground">
        {fr.auth.forgotPassword.body}
      </p>
      <ForgotPasswordForm />
    </AuthFrame>
  );
}
