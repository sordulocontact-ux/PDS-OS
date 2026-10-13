import { fr } from "@/lib/i18n/fr";

/**
 * Who does what in a Conception (MKT-C2-08): the rights the database
 * enforces, said once, so that a refusal is never a surprise.
 */
export function RightsMatrix() {
  const t = fr.conceptionRoles;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-caption text-muted-foreground">{t.matrixHint}</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-left text-caption">
          <thead>
            <tr className="border-b border-border">
              {t.matrixHeads.map((h) => (
                <th key={h} scope="col" className="py-2 pr-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.matrix.map(([role, ...cells]) => (
              <tr key={role} className="border-b border-border last:border-0">
                <th scope="row" className="py-2 pr-3 font-medium">
                  {role}
                </th>
                {cells.map((cell, index) => (
                  <td
                    key={`${role}-${index}`}
                    className="py-2 pr-3 text-muted-foreground"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
