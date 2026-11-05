import Link from "next/link";
import { AuthFrame } from "@/components/auth/auth-frame";
import { requireAnonymous } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { ResendForm } from "./resend-form";

export const metadata = {
  title: `${fr.auth.verifyEmail.title} · ${fr.app.name}`,
};

// The address is never put in the URL: the person types it again to get a
// new email.
export default async function VerifyEmailPage() {
  await requireAnonymous();

  return (
    <AuthFrame
      title={fr.auth.verifyEmail.title}
      footer={<Link href={routes.login}>{fr.auth.common.signIn}</Link>}
    >
      <p className="text-sm text-muted-foreground">
        {fr.auth.verifyEmail.body}
      </p>
      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <p className="text-sm font-medium">{fr.auth.verifyEmail.resendTitle}</p>
        <ResendForm />
      </div>
    </AuthFrame>
  );
}
