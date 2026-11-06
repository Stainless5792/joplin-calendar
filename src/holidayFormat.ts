function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    ` ${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export function formatYearList(years: number[]): string {
  const sorted = [...new Set(years)].sort((a, b) => a - b);
  return sorted.length ? sorted.join(", ") : "none";
}

export function formatYearRange(years: number[]): string {
  const sorted = [...new Set(years)].sort((a, b) => a - b);
  if (!sorted.length) return "none";
  if (sorted.length === 1) return String(sorted[0]);
  return `${sorted[0]}–${sorted[sorted.length - 1]}`;
}
