"use client";

import { IconTriangleWarning } from "nucleo-sharp-essential";
import { useEffect } from "react";

import { EmptyState } from "@/components/shell/empty-state";
import { PageContainer } from "@/components/shell/page-container";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";

const t = fr.errors.failed;

// A read that failed (a database timeout): said in place, inside the app's
// shell, with « Réessayer » — never shown as an empty list or a 404.
export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <PageContainer>
      <EmptyState
        icon={IconTriangleWarning}
        title={t.title}
        body={t.body}
        action={<Button onClick={() => retry()}>{t.retry}</Button>}
      />
    </PageContainer>
  );
}
