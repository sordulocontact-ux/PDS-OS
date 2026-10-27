import { needLabel } from "@/components/production/prep/need-label";
import { PageSection } from "@/components/shell/page-section";
import { FactList } from "@/components/ui/fact-list";
import { productionPreprod } from "@/lib/i18n/fr/production-preprod";
import { productionShoot } from "@/lib/i18n/fr/production-shoot";
import type { CallSheet, PlanAction } from "@/lib/production/preprod/types";
import type { ProductionNeed, SheetLogistics } from "@/lib/production/sheet";
import { formatDate } from "@/lib/release/format";

const fr = { productionPreprod, productionShoot };

const t = fr.productionShoot.day;

/**
 * « Le jour du tournage » (PROD-018): the call sheet's hours and contacts,
 * the place and its access, who holds which position, the blocking plan
 * actions still open and the incidents — all read from the preparation.
 */
export function ShootDay({
  callSheet,
  logistics,
  needs,
  actions,
  openIncidents,
  incidentsHref,
}: {
  callSheet: CallSheet | null;
  logistics: SheetLogistics;
  needs: ProductionNeed[];
  actions: PlanAction[];
  openIncidents: number;
  incidentsHref: string;
}) {
  const team = needs.flatMap((n) =>
    n.assignments
      .filter((a) => a.availability !== "unavailable")
      .map((a) => ({ id: a.id, role: needLabel(n), name: a.holder.name })),
  );
  const critical = actions.filter(
    (a) => a.blocking && a.status === "approved" && a.taskDone !== true,
  );
  return (
    <PageSection
      id="shoot-day"
      title={t.title}
      description={t.description}
      card
    >
      <div className="flex flex-col gap-6">
        <FactList
          emptyLabel={fr.productionPreprod.notFilled}
          facts={[
            { label: t.callTime, value: callSheet?.callTime ?? null },
            {
              label: t.schedule,
              value: callSheet?.schedule ?? null,
              valueClassName: "whitespace-pre-line",
            },
            {
              label: t.location,
              value:
                [logistics.locationName, logistics.locationAddress]
                  .filter(Boolean)
                  .join(" · ") || null,
            },
            {
              label: t.access,
              value: logistics.locationAccess,
              valueClassName: "whitespace-pre-line",
            },
            {
              label: t.contacts,
              value: callSheet?.contactsNote ?? null,
              valueClassName: "whitespace-pre-line",
            },
            {
              label: t.emergencies,
              value: callSheet?.emergencies ?? null,
              valueClassName: "whitespace-pre-line",
            },
          ]}
        />
        <section
          className="flex flex-col gap-2"
          aria-labelledby="shoot-day-team"
        >
          <h3 id="shoot-day-team" className="text-sm font-semibold">
            {t.team}
          </h3>
          {team.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noTeam}</p>
          ) : (
            <ul className="grid gap-1 text-sm sm:grid-cols-2">
              {team.map((m) => (
                <li key={m.id} className="min-w-0 break-words">
                  <span className="text-muted-foreground">{m.role} : </span>
                  {m.name}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section
          className="flex flex-col gap-2"
          aria-labelledby="shoot-day-critical"
        >
          <h3 id="shoot-day-critical" className="text-sm font-semibold">
            {t.critical}
          </h3>
          {critical.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noCritical}</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {critical.map((a) => (
                <li key={a.id} className="break-words">
                  {a.title}
                  {a.holder && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {a.holder.name}
                    </span>
                  )}
                  {a.dueDate && (
                    <span className="text-muted-foreground tabular-nums">
                      {" "}
                      · {t.due(formatDate(a.dueDate))}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        <p className="text-sm">
          {t.incidents(openIncidents)}
          {openIncidents > 0 && (
            <>
              {" · "}
              <a href={incidentsHref} className="underline underline-offset-4">
                {t.toIncidents}
              </a>
            </>
          )}
        </p>
      </div>
    </PageSection>
  );
}
