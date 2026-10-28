import "server-only";

import { cache } from "react";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  SETTINGS_KEY,
  defaultSettings,
  mergeSettings,
  type DeepPartial,
  type SiteSettings,
} from "@/lib/settings-defaults";

export { SETTINGS_KEY, defaultSettings };
export type { DeepPartial, SiteSettings };

/**
 * Business settings live in the database so an administrator can correct
 * contact details and payment instructions without a code change.
 */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const record = await db.siteSetting.findUnique({ where: { key: SETTINGS_KEY } });
    return mergeSettings(defaultSettings, record?.value);
  } catch (error) {
    console.error("[settings] falling back to defaults", error);
    return defaultSettings;
  }
});

export async function updateSiteSettings(
  patch: DeepPartial<SiteSettings>,
  updatedById?: string,
): Promise<SiteSettings> {
  const current = await getSiteSettings();
  const merged = mergeSettings(current, patch);
  await db.siteSetting.upsert({
    where: { key: SETTINGS_KEY },
    create: {
      key: SETTINGS_KEY,
      value: merged as unknown as Prisma.InputJsonValue,
      updatedById: updatedById ?? null,
    },
    update: {
      value: merged as unknown as Prisma.InputJsonValue,
      updatedById: updatedById ?? null,
    },
  });
  return merged;
}
