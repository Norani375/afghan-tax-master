export function fmtNum(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

export function fmtAFN(n: number): string {
  return `${fmtNum(n)} ؋`;
}

export function fmtPct(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
}
