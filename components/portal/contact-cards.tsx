import "server-only";

import { influencePortalCards } from "@/components/activations/influence/public-cards";
import { formPortalCard } from "@/components/legal/forms/public-cards";
import { splitPortalCard } from "@/components/legal/splits/public-cards";
import { masterPortalCards } from "@/components/master-workflow/public-cards";
import { providerPortalCards } from "@/components/production/provider/provider-cards";
import { getCreatorCollaboration } from "@/lib/activations/influence/creator-link";
import { getPublicAgreement } from "@/lib/activations/influence/public";
import { getPublicForm, noteFormOpened } from "@/lib/legal/forms/public";
import { getPublicSplit } from "@/lib/legal/splits/public";
import {
  getEngineerThread,
  getPublicPackage,
  noteOpened,
} from "@/lib/master-workflow/transmission-public";
import {
  getContactCallRequests,
  type ContactItem,
  type OpenContactPage,
} from "@/lib/portal/contact-page";
import { contactItemKey } from "@/lib/portal/link-key";
import { getLinkJourney } from "@/lib/production/provider/journey";
import {
  getProviderLocations,
  getProviderSpace,
  noteProviderOpened,
} from "@/lib/production/provider/public";

import { callPortalCard } from "./portal-call-card";
import type { PortalCardItem } from "./portal-sections";

/**
 * Every card of the person's page (lot 11): each object of theirs in this
 * project, read through its own functions with the person's token and its
 * id, and laid by the same builders as its own link. Opening the page
 * marks each object opened, as its own link would. An object whose link is
 * closed shows nothing; the ids get the object's so two deliverables or
 * two sendings never share an anchor.
 */
export async function loadContactCards(
  token: string,
  page: OpenContactPage,
): Promise<PortalCardItem[]> {
  const lists = await Promise.all(
    page.items.map((item, i) =>
      cardsOf(token, page, item, i).then((cards) =>
        cards.map((c) => ({
          ...c,
          id: `${c.id}-${item.id.slice(0, 8)}`,
          workflow: c.workflow ?? item.workflow,
          order: i * 100 + c.order,
        })),
      ),
    ),
  );
  return lists.flat();
}

async function cardsOf(
  token: string,
  page: OpenContactPage,
  item: ContactItem,
  order: number,
): Promise<PortalCardItem[]> {
  const key = contactItemKey(token, item.id);
  switch (item.kind) {
    case "master": {
      const data = await getPublicPackage(key);
      if (!data || (data.state !== "open" && data.state !== "received"))
        return [];
      await noteOpened(key);
      const thread = await getEngineerThread(key);
      return masterPortalCards({ linkKey: key, data, thread });
    }
    case "form": {
      const form = await getPublicForm(key);
      if (!form || form.state === "expired" || form.state === "revoked")
        return [];
      if (form.state === "open") await noteFormOpened(key);
      return [formPortalCard({ linkKey: key, form })];
    }
    case "split": {
      const split = await getPublicSplit(key);
      if (!split || split.state === "expired" || split.state === "revoked")
        return [];
      return [splitPortalCard({ linkKey: key, split, project: page.project })];
    }
    case "influence": {
      const agreement = await getPublicAgreement(key);
      if (
        !agreement ||
        agreement.state === "expired" ||
        agreement.state === "revoked"
      )
        return [];
      const collab =
        agreement.state === "accepted"
          ? await getCreatorCollaboration(key)
          : null;
      return influencePortalCards({ linkKey: key, agreement, collab });
    }
    case "provider": {
      const space = await getProviderSpace(key);
      if (!space || space.state !== "open") return [];
      await noteProviderOpened(key);
      const [journey, locations] = await Promise.all([
        getLinkJourney(key),
        getProviderLocations(key),
      ]);
      return providerPortalCards({ linkKey: key, space, journey, locations });
    }
    case "call": {
      if (!item.detail) return [];
      const requests = await getContactCallRequests(token);
      return [
        callPortalCard(item, item.detail, order, requests.get(item.id) ?? null),
      ];
    }
  }
}
