import { AuthFrame } from "@/components/auth/auth-frame";
import { requireSignedIn } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { ResetPasswordForm } from "./reset-password-form";

// Reachable with the session opened by the recovery link, or any other
// session: a signed-in account may also change its password here.
export default async function ResetPasswordPage() {
  await requireSignedIn();

  return (
    <AuthFrame title={fr.auth.resetPassword.title}>
      <ResetPasswordForm />
    </AuthFrame>
  );
}
