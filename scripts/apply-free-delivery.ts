/**
 * Applies the free-delivery policy to the configured database.
 *
 *   tsx --tsconfig tsconfig.scripts.json scripts/apply-free-delivery.ts
 *
 * Sets the nationwide area to a zero fee and updates the customer-facing copy so
 * nothing claims a delivery fee is "agreed by phone".
 */
import { PrismaClient } from "@prisma/client";
import { updateSiteSettings } from "@/lib/settings";

const prisma = new PrismaClient();

async function main() {
  await updateSiteSettings({
    store: {
      catalogueNotice:
        "All prices are in Rwandan francs (RWF) and were last reviewed on 26 October 2026. Delivery is free across Rwanda.",
      deliveryNotice:
        "Free delivery across Rwanda. No delivery fee is added at checkout, so the total shown is the final amount for your products.",
    },
  });

  const areas = await prisma.deliveryArea.findMany();
  for (const area of areas) {
    const isNationwide = /rwanda/i.test(area.name) || /nationwide/i.test(area.name);
    if (!isNationwide) continue;
    await prisma.deliveryArea.update({
      where: { id: area.id },
      data: {
        name: "Rwanda - nationwide (free delivery)",
        feeRwf: 0,
        isActive: true,
        notes: "Free delivery across Rwanda. No delivery fee is charged at checkout.",
      },
    });
    console.log(`Updated area: ${area.name} -> free delivery`);
  }

  const active = await prisma.deliveryArea.findMany({
    where: { isActive: true },
    select: { name: true, feeRwf: true },
  });
  console.log("Active areas:", active);
}

main()
  .catch((error) => {
    console.error("Failed:", error.message.split("\n")[0]);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
