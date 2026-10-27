import { IconCircleLogout } from "nucleo-sharp-essential";

import { SubmitButton } from "@/components/auth/submit-button";
import { signOut } from "@/lib/auth/actions";
import { auth } from "@/lib/i18n/fr/auth";

const fr = { auth };

export function SignOutButton({
  variant = "outline",
  className,
}: {
  variant?: "outline" | "ghost";
  className?: string;
}) {
  return (
    <form action={signOut}>
      <SubmitButton
        variant={variant}
        pendingLabel={fr.auth.common.loading}
        className={className}
      >
        <IconCircleLogout aria-hidden />
        {fr.auth.common.signOut}
      </SubmitButton>
    </form>
  );
}
