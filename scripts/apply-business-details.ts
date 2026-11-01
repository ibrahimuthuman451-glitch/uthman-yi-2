/**
 * Writes the owner-confirmed business details into the site settings record.
 *
 *   tsx --tsconfig tsconfig.scripts.json scripts/apply-business-details.ts
 *
 * Business settings live in the database, so an older record overrides the code
 * defaults. This script makes the published email, address, opening hours and
 * services match the Google Business Profile exactly - Google cross-checks them.
 */
import { db } from "@/lib/db";
import { updateSiteSettings } from "@/lib/settings";

const details = {
  email: "ibrahimuthuman451@gmail.com",
  addressLine: "KG 14 Ave, Gisozi",
  region: "Gasabo District",
  city: "Kigali",
  country: "Rwanda",
  phone: "0780551125",
  openingHours: {
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    opens: "08:00",
    closes: "21:00",
  },
  servicesOffered: ["CCTV camera installation", "Starlink installation", "Electronics shop"],
};

async function main() {
  const settings = await updateSiteSettings({ company: details });
  console.log("[settings] published business details:");
  console.log(
    JSON.stringify(
      {
        name: settings.company.name,
        email: settings.company.email,
        address: [
          settings.company.addressLine,
          settings.company.region,
          settings.company.city,
          settings.company.country,
        ].join(", "),
        phone: settings.company.phone,
        hours: `${settings.company.openingHours.opens}-${settings.company.openingHours.closes}`,
        services: settings.company.servicesOffered,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("[settings] failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
