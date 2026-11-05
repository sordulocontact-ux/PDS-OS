"use client";

import { Field } from "@/components/auth/field";
import { MasterForm } from "@/components/catalog/master-page/master-form";
import { IconDisc } from "@/components/icons";
import { OptionSelect } from "@/components/projects/option-select";
import { DialogButton } from "@/components/ui/dialog-button";
import { toast } from "@/components/ui/toast";
import { promoteDemo, setDemoStatus } from "@/lib/catalog/demo-actions";
import { DEMO_STATUSES, type DemoStatus } from "@/lib/catalog/demo-rules";
import { demos } from "@/lib/i18n/fr/demos";

const fr = { demos };

/**
 * A maquette's gestures, in its title page's head: « Changer le statut »
 * (validating is artistic: the direction and the creative direction), and,
 * once validated, « Passer au catalogue des masters » (the release decision,
 * the direction's), on the same row.
 */
export function DemoActions({
  masterId,
  title,
  status,
  artistic,
  canManage,
  canPromote,
}: {
  masterId: string;
  title: string;
  status: DemoStatus;
  // May validate or un-validate (validate / creative_work).
  artistic: boolean;
  // May move it between the other statuses (manage_catalog).
  canManage: boolean;
  canPromote: boolean;
}) {
  const t = fr.demos;
  // The statuses this viewer may give, from where it stands.
  const allowed = DEMO_STATUSES.filter(
    (s) =>
      s === status ||
      artistic ||
      (canManage && s !== "validated" && status !== "validated"),
  );
  return (
    <div className="flex flex-wrap gap-2">
      {allowed.length > 1 && (
        <DialogButton
          label={t.status.change}
          variant={status === "validated" && canPromote ? "outline" : "default"}
          size="lg"
          title={t.status.change}
          description={t.status.validateHint}
        >
          {(close) => (
            <MasterForm
              action={setDemoStatus}
              hidden={{ masterId }}
              onDone={close}
            >
              {({ value, error }) => (
                <OptionSelect
                  name="status"
                  label={t.status.label}
                  required
                  items={Object.fromEntries(
                    allowed.map((s) => [s, t.statuses[s]]),
                  )}
                  defaultValue={value("status", status)}
                  error={error("status")}
                />
              )}
            </MasterForm>
          )}
        </DialogButton>
      )}
      {status === "validated" && canPromote && (
        <DialogButton
          label={t.promote.action}
          icon={IconDisc}
          size="lg"
          title={t.promote.title}
          description={t.promote.description}
        >
          {(close) => (
            <MasterForm
              action={promoteDemo}
              hidden={{ masterId }}
              onDone={() => {
                close();
                toast.success(t.promote.done);
              }}
            >
              {({ value, error }) => (
                <Field
                  name="title"
                  label={t.promote.name}
                  required
                  autoComplete="off"
                  maxLength={200}
                  hint={t.promote.nameHint}
                  defaultValue={value("title", title)}
                  error={error("title")}
                />
              )}
            </MasterForm>
          )}
        </DialogButton>
      )}
    </div>
  );
}
