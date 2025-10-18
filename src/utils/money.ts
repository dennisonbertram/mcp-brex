export type FormatMode = 'cents' | 'dollars' | 'both';

export interface MoneyInput {
  amount: number;
  currency?: string;
}

export interface MoneyOptions {
  locale?: string;
  includeFormatted?: boolean;
  formatMode?: FormatMode;
}

export function formatCurrency(amountDollars: number, currency = 'USD', locale = 'en-US'): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amountDollars);
  } catch {
    // Fallback simple formatter
    return `${currency} ${amountDollars.toFixed(2)}`;
  }
}

export function formatMoney(input: MoneyInput, opts?: MoneyOptions) {
  const currency = input.currency || 'USD';
  const cents = typeof input.amount === 'number' ? input.amount : 0;
  const dollars = cents / 100;
  const includeFormatted = opts?.includeFormatted ?? true;
  const locale = opts?.locale || 'en-US';
  const formatted = includeFormatted ? formatCurrency(dollars, currency, locale) : undefined;
  return {
    amount_cents: cents,
    amount_dollars: dollars,
    ...(includeFormatted ? { amount_formatted: formatted } : {}),
    currency
  } as const;
}

// Shallow predicate for Brex-like Money objects
function isMoneyLike(obj: any): obj is MoneyInput {
  return obj && typeof obj === 'object' && typeof obj.amount === 'number';
}

export interface AnnotateOptions extends MoneyOptions {}

export function annotateAmounts(value: any, opts?: AnnotateOptions): any {
  const mode: FormatMode = opts?.formatMode ?? 'both';
  function annotateMoney(m: any) {
    if (!isMoneyLike(m)) return m;
    const fm = formatMoney(m, opts);
    const mm = m as any;
    if (mode === 'cents') {
      mm.amount_cents = fm.amount_cents;
      if (opts?.includeFormatted ?? true) mm.amount_formatted = fm.amount_formatted;
      mm.currency = fm.currency;
    } else if (mode === 'dollars') {
      mm.amount_dollars = fm.amount_dollars;
      if (opts?.includeFormatted ?? true) mm.amount_formatted = fm.amount_formatted;
      mm.currency = fm.currency;
    } else {
      // both
      mm.amount_cents = fm.amount_cents;
      mm.amount_dollars = fm.amount_dollars;
      if (opts?.includeFormatted ?? true) mm.amount_formatted = fm.amount_formatted;
      mm.currency = fm.currency;
    }
    return m;
  }

  function walk(node: any): any {
    if (Array.isArray(node)) {
      return node.map(walk);
    }
    if (node && typeof node === 'object') {
      // If this object itself is money-like, annotate it
      if (isMoneyLike(node)) return annotateMoney(node);
      // Else traverse fields
      for (const k of Object.keys(node)) {
        const v = (node as any)[k];
        (node as any)[k] = walk(v);
      }
      return node;
    }
    return node;
  }

  return walk(value);
}

export interface Summary {
  total_cents: number;
  total_dollars: number;
  total_formatted?: string;
  average_dollars: number;
  count: number;
  largest_dollars?: number;
  smallest_dollars?: number;
}

export function summarizeAmounts<T>(items: T[], getMoney: (item: T) => MoneyInput | undefined, opts?: { currency?: string; locale?: string; includeFormatted?: boolean }): Summary {
  let totalCents = 0;
  let count = 0;
  let largestD = -Infinity;
  let smallestD = Infinity;
  for (const it of items) {
    const m = getMoney(it);
    if (!m) continue;
    totalCents += m.amount || 0;
    count++;
    const d = (m.amount || 0) / 100;
    if (d > largestD) largestD = d;
    if (d < smallestD) smallestD = d;
  }
  const totalD = totalCents / 100;
  const avgD = count ? totalD / count : 0;
  const currency = opts?.currency || 'USD';
  const includeFormatted = opts?.includeFormatted ?? true;
  return {
    total_cents: totalCents,
    total_dollars: totalD,
    ...(includeFormatted ? { total_formatted: formatCurrency(totalD, currency, opts?.locale || 'en-US') } : {}),
    average_dollars: avgD,
    count,
    largest_dollars: isFinite(largestD) ? largestD : undefined,
    smallest_dollars: isFinite(smallestD) ? smallestD : undefined,
  };
}

export function defaultFieldNotes() {
  return {
    amount: 'All monetary amounts are in cents. Use amount_dollars and amount_formatted for display and arithmetic.'
  };
}
