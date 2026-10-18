"use client";

import { CallPrepForm } from "@/components/calls/prep/call-prep-form";
import { CallDeliverablesField } from "@/components/design/call-deliverables-field";
import { useDesignCallAgenda } from "@/components/design/use-design-call-agenda";
import type { DesignCallSheetData } from "@/lib/design/call-prep";

/**
 * The creative exchange in the common call form: the deliverables it is
 * about come first, PO's points and the objective follow the choice.
 */
export function ConceptionCallPrep({ data }: { data: DesignCallSheetData }) {
  const agenda = useDesignCallAgenda(data);
  return (
    <CallPrepForm
      defaults={data.prep}
      agenda={agenda.agenda}
      goal={agenda.goal}
      extraIds={agenda.ids}
      extra={
        <CallDeliverablesField
          id="design-call-deliverables"
          deliverables={data.deliverables}
          selected={agenda.selected}
          onToggle={agenda.toggle}
        />
      }
    />
  );
}
