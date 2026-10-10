"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import { createCreativeBrief } from "@/lib/design/actions/brief";
import { fr } from "@/lib/i18n/fr";

/**
 * « Créer une nouvelle version » of the Brief créatif: the server builds
 * the content from the project, then the new version opens.
 */
export function CreateBriefButton({
  projectId,
  first,
}: {
  projectId: string;
  first: boolean;
}) {
  const t = fr.conceptionDirection.brief;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="lg"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await createCreativeBrief(projectId);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success(t.created(result.number));
          router.push(routes.projectDesignBrief(projectId, result.number));
        })
      }
    >
      {pending ? t.creating : first ? t.createFirst : t.create}
    </Button>
  );
}
