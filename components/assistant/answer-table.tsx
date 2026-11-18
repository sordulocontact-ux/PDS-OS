import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableRow,
} from "@/components/ui/data-table";
import { MarkedText } from "@/components/ui/marked-text";
import type { Source } from "@/lib/assistant/sources";

// Accents, case and spaces aside: « Néons » and « neons » are one name.
const fold = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\*\*/g, "")
    .trim()
    .toLowerCase();

/**
 * A table PO wrote (« | a | b | », docs/ASSISTANT.md § 4: dès 3 éléments
 * comparables), drawn as every table of the app (DataTable). A row whose
 * first cell is the exact name of a record a function read opens that
 * record: the link is the code's source, never one the model wrote.
 * Wider than the panel, it scrolls sideways.
 */
export function AnswerTable({
  rows,
  links,
}: {
  rows: string[][];
  links: Source[];
}) {
  const [head, ...body] = rows;
  if (!head || body.length === 0) return null;
  const byName = new Map(links.map((s) => [fold(s.label), s.href]));
  const last = head.length - 1;
  return (
    <div className="overflow-x-auto">
      <DataTable framed>
        <DataTableHeader>
          {head.map((cell, i) => (
            <DataTableHead key={i} fill={i === last}>
              <MarkedText text={cell} />
            </DataTableHead>
          ))}
        </DataTableHeader>
        <DataTableBody>
          {body.map((row, r) => {
            const href = byName.get(fold(row[0] ?? "")) ?? null;
            return (
              <DataTableRow key={r}>
                {head.map((_, i) => (
                  <DataTableCell key={i} fill={i === last}>
                    {i === 0 && href ? (
                      <DataTableLink href={href}>
                        <MarkedText text={row[0]} />
                      </DataTableLink>
                    ) : (
                      <MarkedText text={row[i] ?? ""} />
                    )}
                  </DataTableCell>
                ))}
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>
    </div>
  );
}
