export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value || 0);

export const formatShortCurrency = (value: number): string => {
  const v = value || 0;
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} tỷ`;
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(0)} tr`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(0)} k`;
  return new Intl.NumberFormat('vi-VN').format(v);
};

/** Dashboard color tokens (CSS vars). */
export const DASH_COLORS = {
  revenue: 'hsl(var(--success))',
  expense: 'hsl(var(--destructive))',
  balance: 'hsl(var(--primary))',
  accent: 'hsl(var(--brand-gold))',
  muted: 'hsl(var(--muted-foreground))',
};
