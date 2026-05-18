export function formatCompactNumber(value: number): string {
  return Intl.NumberFormat('en', { notation: 'compact' }).format(value);
}
