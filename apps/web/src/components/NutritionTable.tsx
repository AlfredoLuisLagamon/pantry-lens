"use client";

import type { NutritionPer100g } from "@/lib/api/types";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import type { MessageKey } from "@/lib/i18n";

type NutritionTableProps = {
  per100g: NutritionPer100g;
};

const ROWS: Array<{
  key: keyof NutritionPer100g;
  labelKey: MessageKey;
  unit: "kcal" | "g";
}> = [
  { key: "energyKcal", labelKey: "nutrition.energy", unit: "kcal" },
  { key: "fat", labelKey: "nutrition.fat", unit: "g" },
  { key: "saturatedFat", labelKey: "nutrition.saturatedFat", unit: "g" },
  { key: "carbohydrates", labelKey: "nutrition.carbohydrates", unit: "g" },
  { key: "sugars", labelKey: "nutrition.sugars", unit: "g" },
  { key: "fiber", labelKey: "nutrition.fiber", unit: "g" },
  { key: "proteins", labelKey: "nutrition.protein", unit: "g" },
  { key: "salt", labelKey: "nutrition.salt", unit: "g" },
];

function formatValue(value: number | null, unit: "kcal" | "g"): string {
  if (value === null) {
    return "—";
  }
  return unit === "kcal" ? `${value} kcal` : `${value} g`;
}

export function NutritionTable({ per100g }: NutritionTableProps) {
  const { t } = useTranslation();

  return (
    <div className="mt-4">
      <p className="mb-3 text-sm font-medium text-[var(--text-secondary)]">
        {t("nutrition.per100g")}
      </p>
      <table className="w-full max-w-md border-collapse text-sm">
        <tbody>
          {ROWS.map((row) => (
            <tr
              key={row.key}
              className="border-t border-[var(--border)] first:border-t-0"
            >
              <th
                scope="row"
                className="py-2.5 pr-4 text-left font-medium text-[var(--foreground)]"
              >
                {t(row.labelKey)}
              </th>
              <td className="py-2.5 text-right tabular-nums text-[var(--text-secondary)]">
                {formatValue(per100g[row.key], row.unit)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
