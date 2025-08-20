import { Expense } from "../services/brex/expenses-types.js";

export function estimateTokens(str: string): number {
  return Math.ceil(Buffer.byteLength(str, 'utf8') / 4);
}

export type Projection = string[];

function pick(obj: any, path: string): any {
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function projectExpense(expense: Expense, fields: Projection): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const val = pick(expense as any, f);
    if (val !== undefined) {
      // set nested output
      const parts = f.split('.');
      let target: any = out;
      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        target[key] = target[key] ?? {};
        target = target[key];
      }
      target[parts[parts.length - 1]] = val;
    }
  }
  return out;
}

export interface LimitOptions {
  summaryOnly?: boolean;
  fields?: Projection;
  hardTokenLimit?: number; // if exceeded, enforce summary
}

const DEFAULT_SUMMARY_FIELDS: Projection = [
  'id',
  'updated_at',
  'status',
  'payment_status',
  'expense_type',
  'purchased_at',
  'purchased_amount.amount',
  'purchased_amount.currency',
  'merchant.raw_descriptor',
  'category',
  'budget_id',
  'merchant_id'
];

export function limitExpensesPayload(
  expenses: Expense[],
  options?: LimitOptions
): { items: any[]; summaryApplied: boolean } {
  const { summaryOnly, fields, hardTokenLimit = 24000 } = options || {};
  const useFields = fields && fields.length > 0 ? fields : DEFAULT_SUMMARY_FIELDS;

  if (summaryOnly) {
    return { items: expenses.map(e => projectExpense(e, useFields)), summaryApplied: true };
  }

  // Try full items quickly measure size
  const fullText = JSON.stringify(expenses);
  if (estimateTokens(fullText) <= hardTokenLimit) {
    return { items: expenses, summaryApplied: false };
  }

  // Fallback to summary projection
  const projected = expenses.map(e => projectExpense(e, useFields));
  return { items: projected, summaryApplied: true };
}


