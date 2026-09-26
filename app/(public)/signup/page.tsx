import Link from "next/link";
import { AuthFrame } from "@/components/auth/auth-frame";
import { requireAnonymous } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { SignUpForm } from "./signup-form";

export default async function SignUpPage() {
  await requireAnonymous();

  return (
    <AuthFrame
      title={fr.auth.signup.title}
      footer={<Link href={routes.login}>{fr.auth.signup.haveAccount}</Link>}
    >
      <SignUpForm />
    </AuthFrame>
  );
}
