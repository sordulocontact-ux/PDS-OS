import "server-only";

import { cache } from "react";

import type { Access } from "@/lib/auth/access";
import { loadDeliveryTab } from "@/lib/production/delivery/queries";
import { loadPostProduction } from "@/lib/production/post/queries";
import { loadPreprod } from "@/lib/production/preprod/queries";
import { loadProductionSheet } from "@/lib/production/sheet";
import { loadShootData } from "@/lib/production/shoot/queries";

// Each tab's data, read once per request: the sheet's layout (its next
// action, PROD-001) and the tab itself share it. Null without a sheet.

export const preprodFor = cache(
  async (projectId: string, deliverableId: string, access: Access) => {
    const data = await loadProductionSheet(projectId, deliverableId, access);
    if (!data?.sheet) return null;
    return loadPreprod(projectId, { ...data, sheet: data.sheet });
  },
);

export const shootFor = cache(
  async (projectId: string, deliverableId: string, access: Access) => {
    const data = await loadProductionSheet(projectId, deliverableId, access);
    if (!data?.sheet) return null;
    return loadShootData({
      projectId,
      sheetId: data.sheet.id,
      members: data.members,
      contacts: data.contacts,
    });
  },
);

export const postFor = cache(
  async (projectId: string, deliverableId: string, access: Access) => {
    const data = await loadProductionSheet(projectId, deliverableId, access);
    if (!data?.sheet) return null;
    return loadPostProduction({
      projectId,
      sheetId: data.sheet.id,
      members: data.members,
      contacts: data.contacts,
    });
  },
);

export const deliveryFor = cache(
  async (projectId: string, deliverableId: string, access: Access) => {
    const data = await loadProductionSheet(projectId, deliverableId, access);
    if (!data?.sheet) return null;
    return loadDeliveryTab(data.sheet.id, deliverableId, data.members);
  },
);
