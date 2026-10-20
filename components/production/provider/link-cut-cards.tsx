import type { PortalCardItem } from "@/components/portal/portal-sections";
import { LightDepositForm } from "@/components/production/light/light-deposit-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { VersionCard } from "@/components/ui/version-card";
import { fr } from "@/lib/i18n/fr";
import type { LinkJourney } from "@/lib/production/provider/journey";
import type { Tone } from "@/lib/ui/state-tones";
import { formatShortInstant } from "@/lib/utils/day";

import {
  LinkCutDecision,
  LinkCutDepositForm,
  LinkFinalForm,
} from "./link-cut-forms";

const t = fr.productionCut;
type Cut = NonNullable<LinkJourney["cut"]>;
type CutVersion = Cut["versions"][number];
const SENT_BACK = ["changes_requested", "refused"];
const SHOT = ["done", "partial", "interrupted"];

function stateOf(
  v: CutVersion,
  latest: boolean,
): { tone: Tone; label: string } {
  if (v.status === "approved")
    return { tone: "success", label: t.status.approved };
  if (SENT_BACK.includes(v.status))
    return { tone: "warning", label: t.status.changes };
  if (!latest)
    return { tone: "neutral", label: t.status.replaced(v.number + 1) };
  return { tone: "info", label: t.status.review };
}

/** The versions as the link shows them (proto postCard): state, link or
 * file, both validations, what PDS asked. */
function CutVersions({ cut, light }: { cut: Cut; light: boolean }) {
  if (cut.versions.length === 0) return null;
  const s = t.side;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-semibold">
        {light ? fr.productionProposal.versions : t.versions}
      </h3>
      {cut.versions.map((v, i) => {
        const latest = i === 0;
        const int = v.intApproved
          ? s.states.approved
          : SENT_BACK.includes(v.status) && v.extStatus !== "changes"
            ? s.states.changes
            : s.states.pending;
        return (
          <VersionCard
            key={v.id}
            title={
              light ? fr.productionLight.version(v.number) : t.version(v.number)
            }
            status={stateOf(v, latest)}
            meta={t.deposited(formatShortInstant(v.submittedAt))}
            defaultOpen={latest || v.status === "approved"}
          >
            {v.url ? (
              <a
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-fit break-all underline underline-offset-4"
              >
                {v.url}
              </a>
            ) : v.fileName ? (
              <span>
                {v.width && v.height
                  ? fr.productionLight.read(v.fileName, v.width, v.height)
                  : v.fileName}
              </span>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <StatusBadge size="sm" tone={v.intApproved ? "success" : "info"}>
                {s.int(int)}
              </StatusBadge>
              <StatusBadge
                size="sm"
                tone={
                  v.extStatus === "approved"
                    ? "success"
                    : v.extStatus === "changes"
                      ? "warning"
                      : v.extStatus === "pending"
                        ? "info"
                        : "neutral"
                }
              >
                {v.extStatus === "none" ? s.none : s.ext(s.states[v.extStatus])}
              </StatusBadge>
            </div>
            {v.note && (
              <p className="text-[color:var(--text-secondary)]">
                {t.asked(v.note)}
              </p>
            )}
            {v.extNote && (
              <p className="text-[color:var(--text-secondary)]">
                {t.saidExt(v.extNote)}
              </p>
            )}
          </VersionCard>
        );
      })}
    </div>
  );
}

/**
 * The edit on the company's and the external validation's links (proto
 * portal: post, delivery), or a light journey's versions on the link of
 * whoever produces it: deposit the versions and the final file, decide in
 * addition to PDS.
 */
export function linkCutCards(token: string, j: LinkJourney): PortalCardItem[] {
  const cut = j.cut;
  if (!cut) return [];
  const company = j.roles.includes("company");
  const validator = j.roles.includes("creativeExt");
  const latest = cut.versions[0] ?? null;
  const next = (latest?.number ?? 0) + 1;
  const approved = cut.versions.find((v) => v.status === "approved") ?? null;
  const waiting =
    latest &&
    !SENT_BACK.includes(latest.status) &&
    latest.status !== "approved";
  const light = cut.track !== "shoot";
  const gateOpen = !cut.gate || cut.gate.done;
  // Before the shoot, the edit's card waits (proto: newest step on top).
  // The edit follows the rushes (proto: Rushes → Montage et retours).
  if (
    !light &&
    cut.versions.length === 0 &&
    (!SHOT.includes(j.shootState ?? "") || (company && !j.rushesUrl))
  )
    return [];
  const deposit =
    company && gateOpen && (!latest || SENT_BACK.includes(latest.status));
  const decide = validator && waiting && latest?.extStatus === "pending";
  const cards: PortalCardItem[] = [
    {
      id: "ps-cut",
      title: light
        ? cut.track === "artwork"
          ? t.light.cover
          : t.light.title
        : t.title,
      state: deposit || decide ? "todo" : approved ? "done" : "waiting",
      order: 70,
      action: deposit
        ? { label: t.todo.deposit(next) }
        : decide && latest
          ? { label: t.todo.review(latest.number) }
          : null,
      body: (
        <>
          <p className="text-pretty text-muted-foreground">
            {light ? t.light.hint : t.hint}
          </p>
          {cut.gate && !cut.gate.done && (
            <p>{fr.productionLight.gateWait(cut.gate.clip ?? "—")}</p>
          )}
          <CutVersions cut={cut} light={light} />
          {decide && latest && (
            <LinkCutDecision
              token={token}
              versionId={latest.id}
              number={latest.number}
              light={light}
            />
          )}
          {deposit &&
            (light ? (
              <LinkLightDeposit
                token={token}
                number={next}
                cover={cut.track === "artwork"}
              />
            ) : (
              <LinkCutDepositForm token={token} number={next} />
            ))}
        </>
      ),
    },
  ];
  // The final file and the delivery (the shoot's journey, the company).
  if (!light && company && approved)
    cards.push({
      id: "ps-delivery",
      title: t.delivery.title,
      state: cut.deliveredAt ? "done" : cut.finalUrl ? "waiting" : "todo",
      order: 80,
      action: cut.finalUrl ? null : { label: t.todo.final },
      body: (
        <>
          <p>{t.delivery.validated(approved.number)}</p>
          {cut.deliveredAt ? (
            <p>
              {t.delivery.delivered(
                cut.recipients.filter(Boolean).join(", "),
                formatShortInstant(cut.deliveredAt),
              )}
            </p>
          ) : cut.finalUrl && cut.finalAt ? (
            <p className="text-[color:var(--text-secondary)]">
              {t.delivery.sent(formatShortInstant(cut.finalAt))}{" "}
              {t.delivery.waiting}
            </p>
          ) : (
            <LinkFinalForm token={token} number={approved.number} />
          )}
        </>
      ),
    });
  return cards;
}

function LinkLightDeposit({
  token,
  number,
  cover,
}: {
  token: string;
  number: number;
  cover: boolean;
}) {
  return (
    <LightDepositForm
      place={{ kind: "link", token }}
      number={number}
      image={cover}
    />
  );
}
