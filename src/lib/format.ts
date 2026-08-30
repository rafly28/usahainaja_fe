const idNumber = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 });
const idCurrency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function numeric(value: number | string | null | undefined): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatNumber(value: number | string | null | undefined): string {
  return idNumber.format(numeric(value));
}

export function formatCurrency(value: number | string | null | undefined): string {
  return idCurrency.format(numeric(value));
}

export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return isoString;
  }
}

export function isLowStock(
  quantity: number | string | null | undefined,
  minimum: number | string | null | undefined,
): boolean {
  const min = numeric(minimum);
  return min > 0 && numeric(quantity) <= min;
}
