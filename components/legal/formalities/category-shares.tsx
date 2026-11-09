"use client";

import { Field } from "@/components/auth/field";
import { FieldError } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { legalFormalities } from "@/lib/i18n/fr/legal-formalities";
import type {
  Creator,
  PhonoSplit,
  Publisher,
} from "@/lib/legal/formalities/definition";
import type { DossierErrors } from "@/lib/legal/formalities/field-errors";
import {
  CATEGORIES,
  categoryParts,
  categoryTotal,
  creatorName,
  equalShares,
  membersOf,
  usualParts,
  type Member,
  type ShareCategory,
} from "@/lib/legal/formalities/participants";
import { FULL, formatShare } from "@/lib/legal/splits/shares";
import { cn } from "@/lib/utils";

const fr = { legalFormalities };

/**
 * The head of « 4. Répartition » (retour d'Ibé du 02/11/2026): each category
 * — Auteur, Compositeur, Éditeur — shared on its own, its total checked
 * apart (« Parts égales » in one click, a member alone is 100 %); then the
 * Phono parts between the categories, the usual ones or a contract's. The
 * bulletin's Phono shares are derived from both, so they always make 100 %.
 */
export function CategoryShares({
  id,
  creators,
  publishers,
  split,
  disabled,
  errors,
  onPeople,
  onSplit,
}: {
  id: string;
  creators: Creator[];
  publishers: Publisher[];
  split: PhonoSplit;
  disabled: boolean;
  errors: DossierErrors | null;
  onPeople: (next: { creators: Creator[]; publishers: Publisher[] }) => void;
  onSplit: (next: PhonoSplit) => void;
}) {
  const t = fr.legalFormalities.categories;
  const members = membersOf(creators, publishers);
  const held = CATEGORIES.filter((c) => members[c].length > 0);
  if (held.length === 0) return null;

  const nameOf = (m: Member) =>
    m.publisher !== undefined
      ? publishers[m.publisher].name || "—"
      : creatorName(creators[m.creator!]) || "—";
  const roleOf = (m: Member) =>
    m.role ? fr.legalFormalities.qualities[m.role] : t.names.publisher;
  const setShares = (list: Member[], values: string[]) =>
    onPeople({
      creators: creators.map((c, i) => {
        const mine = list.filter((m) => m.creator === i);
        if (mine.length === 0) return c;
        const shares = { ...c.shares };
        mine.forEach((m) => {
          shares[m.role!] = values[list.indexOf(m)];
        });
        return { ...c, shares };
      }),
      publishers: publishers.map((p, i) => {
        const k = list.findIndex((m) => m.publisher === i);
        return k < 0 ? p : { ...p, share: values[k] };
      }),
    });

  const parts = categoryParts(members, split);
  const edited = members.publisher.length > 0;
  const custom = split.custom ?? null;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{t.intro}</p>
      {held.map((category) => (
        <CategoryBox
          key={category}
          id={`${id}-${category}`}
          category={category}
          list={members[category]}
          disabled={disabled}
          error={errors?.sharing[category]}
          nameOf={nameOf}
          roleOf={roleOf}
          onShares={(values) => setShares(members[category], values)}
        />
      ))}
      <div className="flex flex-col gap-2 rounded-xl border p-3">
        <span className="font-medium">{t.parts}</span>
        {!custom ? (
          <p className="text-sm text-muted-foreground tabular-nums">
            {t.partsUsual(
              held
                .map((c) => `${t.names[c]} ${formatShare(parts[c])}`)
                .join(" · "),
              edited,
            )}
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{t.partsHint}</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {held.map((c) => (
                <Field
                  key={c}
                  name={`${id}-part-${c}`}
                  label={t.names[c]}
                  inputMode="decimal"
                  suffix="%"
                  value={custom[c].replace(".", ",")}
                  disabled={disabled}
                  onChange={(e) =>
                    onSplit({
                      ...split,
                      custom: {
                        ...custom,
                        [c]: e.target.value.replace(",", "."),
                      },
                    })
                  }
                />
              ))}
            </div>
          </>
        )}
        <FieldError id={`${id}-parts-error`}>
          {errors?.fields.phono_split}
        </FieldError>
        {!disabled && (
          <Button
            size="sm"
            variant="outline"
            className="self-start"
            onClick={() =>
              onSplit({ ...split, custom: custom ? null : usualParts(members) })
            }
          >
            {custom ? t.partsReset : t.partsEdit}
          </Button>
        )}
      </div>
    </div>
  );
}

function CategoryBox({
  id,
  category,
  list,
  disabled,
  error,
  nameOf,
  roleOf,
  onShares,
}: {
  id: string;
  category: ShareCategory;
  list: Member[];
  disabled: boolean;
  error?: string;
  nameOf: (m: Member) => string;
  roleOf: (m: Member) => string;
  onShares: (values: string[]) => void;
}) {
  const t = fr.legalFormalities.categories;
  const total = categoryTotal(list);
  // Words and music by one person only: their role says which line it is.
  const showRole = (m: Member) => m.role === "arranger" || m.role === "adapter";
  return (
    <div className="flex flex-col gap-2 rounded-xl border p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">{t.names[category]}</span>
        <span
          className={cn(
            "text-sm tabular-nums",
            total === FULL
              ? "text-muted-foreground"
              : error
                ? "text-error"
                : "text-[color:var(--tone-warning-fg)]",
          )}
        >
          {t.total(formatShare(total))}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{t.hints[category]}</p>
      {list.length === 1 ? (
        <p className="text-sm">
          <span className="font-medium">{nameOf(list[0])}</span> · {t.sole}
        </p>
      ) : (
        <>
          {list.map((m, k) => (
            <div
              key={`${m.creator ?? "p"}-${m.role ?? m.publisher}`}
              className="grid items-center gap-2 sm:grid-cols-[1fr_10rem]"
            >
              <span className="text-sm font-medium break-words">
                {nameOf(m)}
                {showRole(m) && (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    · {roleOf(m)}
                  </span>
                )}
              </span>
              <Field
                name={`${id}-${k}`}
                label={t.shareLabel(nameOf(m), roleOf(m))}
                hideLabel
                inputMode="decimal"
                suffix="%"
                value={m.share.replace(".", ",")}
                disabled={disabled}
                aria-invalid={error ? true : undefined}
                onChange={(e) =>
                  onShares(
                    list.map((x, j) =>
                      j === k ? e.target.value.replace(",", ".") : x.share,
                    ),
                  )
                }
              />
            </div>
          ))}
          {!disabled && (
            <Button
              size="sm"
              variant="outline"
              className="self-start"
              onClick={() => onShares(equalShares(list.length))}
            >
              {t.equal}
            </Button>
          )}
        </>
      )}
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}
