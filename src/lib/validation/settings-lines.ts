/**
 * Parses the delivery-area textarea used in admin settings.
 * Format: one area per line -> "Kigali CBD | 5000 | active".
 */
export type ParsedDeliveryArea = {
  name: string;
  feeRwf: number;
  isActive: boolean;
  notes: string;
};

export function parseDeliveryAreaLines(raw: string): {
  areas: ParsedDeliveryArea[];
  errors: string[];
} {
  const areas: ParsedDeliveryArea[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 30)
    .forEach((line, index) => {
      const parts = line.split("|").map((part) => part.trim());
      const name = parts[0] ?? "";
      const feeRaw = (parts[1] ?? "").replace(/[,\s]/g, "");
      const activeRaw = (parts[2] ?? "active").toLowerCase();

      if (name.length < 2 || name.length > 80) {
        errors.push(`Line ${index + 1}: area name must be 2-80 characters.`);
        return;
      }
      if (seen.has(name.toLowerCase())) {
        errors.push(`Line ${index + 1}: duplicate area "${name}".`);
        return;
      }
      if (!/^\d+$/.test(feeRaw)) {
        errors.push(`Line ${index + 1}: fee must be a whole number of RWF (use 0 for free delivery).`);
        return;
      }
      seen.add(name.toLowerCase());
      areas.push({
        name,
        feeRwf: Number(feeRaw),
        isActive: activeRaw !== "inactive" && activeRaw !== "no" && activeRaw !== "false",
        notes: parts.slice(3).join(" | ").slice(0, 200),
      });
    });

  return { areas, errors };
}

export function formatDeliveryAreaLines(
  areas: { name: string; feeRwf: number; isActive: boolean; notes: string | null }[],
): string {
  return areas
    .map(
      (area) =>
        `${area.name} | ${area.feeRwf} | ${area.isActive ? "active" : "inactive"}${area.notes ? ` | ${area.notes}` : ""}`,
    )
    .join("\n");
}
