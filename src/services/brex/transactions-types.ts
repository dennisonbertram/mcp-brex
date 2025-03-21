/**
 * @file Brex Transactions API Types
 * @version 1.0.0
 * @description Type definitions for Brex Transactions API
 */

/**
 * Money represents a monetary amount with currency
 */
export interface Money {
  amount: number;
  currency?: string;
}

/**
 * Merchant information for a card transaction
 */
export interface Merchant {
  raw_descriptor: string;
  mcc: string;
  country: string;
}

/**
 * CardTransactionType enum for card transactions
 */
export type CardTransactionType = 
  | 'PURCHASE'
  | 'REFUND'
  | 'CHARGEBACK'
  | 'REWARDS_CREDIT'
  | 'COLLECTION'
  | 'BNPL_FEE';

/**
 * CashTransactionType enum for cash transactions
 */
export type CashTransactionType = 
  | 'PAYMENT'
  | 'DIVIDEND'
  | 'FEE'
  | 'ADJUSTMENT'
  | 'INTEREST'
  | 'CARD_COLLECTION'
  | 'REWARDS_REDEMPTION'
  | 'RECEIVABLES_OFFERS_ADVANCE'
  | 'FBO_TRANSFER'
  | 'RECEIVABLES_OFFERS_REPAYMENT'
  | 'RECEIVABLES_OFFERS_COLLECTION'
  | 'BREX_OPERATIONAL_TRANSFER'
  | 'INTRA_CUSTOMER_ACCOUNT_BOOK_TRANSFER'
  | 'BOOK_TRANSFER'
  | 'CRYPTO_BRIDGE';

/**
 * Status enum for accounts
 */
export type Status = 'ACTIVE';

/**
 * CardTransaction represents a card transaction
 */
export interface CardTransaction {
  id: string;
  card_id?: string;
  description: string;
  amount: Money;
  initiated_at_date: string;
  posted_at_date: string;
  type?: CardTransactionType;
  merchant?: Merchant;
  card_metadata?: Record<string, string>;
  expense_id?: string;
}

/**
 * CashTransaction represents a cash transaction
 */
export interface CashTransaction {
  id: string;
  description: string;
  amount?: Money;
  initiated_at_date: string;
  posted_at_date: string;
  type?: CashTransactionType;
  transfer_id?: string;
}

/**
 * CardAccount represents a card account
 */
export interface CardAccount {
  id: string;
  status?: Status;
  current_balance?: Money;
  available_balance?: Money;
  account_limit?: Money;
  current_statement_period: StatementPeriod;
}

/**
 * CashAccount represents a cash account
 */
export interface CashAccount {
  id: string;
  name: string;
  status?: Status;
  current_balance: Money;
  available_balance: Money;
  account_number: string;
  routing_number: string;
  primary: boolean;
}

/**
 * StatementPeriod represents a statement period
 */
export interface StatementPeriod {
  start_date: string;
  end_date: string;
}

/**
 * Statement represents a statement
 */
export interface Statement {
  id: string;
  start_balance?: Money;
  end_balance?: Money;
  period: StatementPeriod;
}

/**
 * Paginated response for card transactions
 */
export interface PageCardTransaction {
  next_cursor?: string;
  items: CardTransaction[];
}

/**
 * Paginated response for cash transactions
 */
export interface PageCashTransaction {
  next_cursor?: string;
  items: CashTransaction[];
}

/**
 * Paginated response for cash accounts
 */
export interface PageCashAccount {
  next_cursor?: string;
  items: CashAccount[];
}

/**
 * Paginated response for statements
 */
export interface PageStatement {
  next_cursor?: string;
  items: Statement[];
}

/**
 * Type guards
 */

export const isCardAccount = (obj: unknown): obj is CardAccount => {
  const account = obj as CardAccount;
  return (
    typeof account === 'object' &&
    account !== null &&
    typeof account.id === 'string' &&
    typeof account.current_statement_period === 'object' &&
    typeof account.current_statement_period.start_date === 'string' &&
    typeof account.current_statement_period.end_date === 'string'
  );
};

export const isCashAccount = (obj: unknown): obj is CashAccount => {
  const account = obj as CashAccount;
  return (
    typeof account === 'object' &&
    account !== null &&
    typeof account.id === 'string' &&
    typeof account.name === 'string' &&
    typeof account.current_balance === 'object' &&
    typeof account.available_balance === 'object' &&
    typeof account.account_number === 'string' &&
    typeof account.routing_number === 'string' &&
    typeof account.primary === 'boolean'
  );
};

export const isCardTransaction = (obj: unknown): obj is CardTransaction => {
  const tx = obj as CardTransaction;
  return (
    typeof tx === 'object' &&
    tx !== null &&
    typeof tx.id === 'string' &&
    typeof tx.description === 'string' &&
    typeof tx.amount === 'object' &&
    typeof tx.initiated_at_date === 'string' &&
    typeof tx.posted_at_date === 'string'
  );
};

export const isCashTransaction = (obj: unknown): obj is CashTransaction => {
  const tx = obj as CashTransaction;
  return (
    typeof tx === 'object' &&
    tx !== null &&
    typeof tx.id === 'string' &&
    typeof tx.description === 'string' &&
    typeof tx.initiated_at_date === 'string' &&
    typeof tx.posted_at_date === 'string'
  );
};

export const isStatement = (obj: unknown): obj is Statement => {
  const stmt = obj as Statement;
  return (
    typeof stmt === 'object' &&
    stmt !== null &&
    typeof stmt.id === 'string' &&
    typeof stmt.period === 'object' &&
    typeof stmt.period.start_date === 'string' &&
    typeof stmt.period.end_date === 'string'
  );
}; 