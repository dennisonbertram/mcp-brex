/**
 * @file Brex API Types
 * @version 1.0.0
 * @status STABLE - DO NOT MODIFY WITHOUT TESTS
 * @lastModified 2024-02-14
 * 
 * Type definitions for Brex API responses
 * 
 * IMPORTANT:
 * - Add tests when adding new types
 * - Keep in sync with Brex API documentation
 * 
 * Functionality:
 * - Type definitions for Brex API responses
 * - Type guards and validation
 */

export interface BrexAccount {
  id: string;
  name: string;
  description?: string;
  type: 'CASH' | 'CARD';
  currency: string;
  balance: {
    amount: number;
    currency: string;
  };
  status: 'ACTIVE' | 'INACTIVE';
}

export interface BrexTransaction {
  id: string;
  date: string;
  description: string;
  amount: {
    amount: number;
    currency: string;
  };
  status: 'PENDING' | 'POSTED';
  type: 'DEBIT' | 'CREDIT';
  category?: string;
  merchant?: {
    name: string;
    category?: string;
  };
  accountId: string;
}

export interface BrexPaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}

// Type guards
export const isBrexAccount = (obj: unknown): obj is BrexAccount => {
  const account = obj as BrexAccount;
  return (
    typeof account === 'object' &&
    account !== null &&
    typeof account.id === 'string' &&
    typeof account.name === 'string' &&
    typeof account.type === 'string' &&
    typeof account.currency === 'string' &&
    typeof account.balance === 'object' &&
    typeof account.balance.amount === 'number' &&
    typeof account.balance.currency === 'string' &&
    typeof account.status === 'string'
  );
};

export const isBrexTransaction = (obj: unknown): obj is BrexTransaction => {
  const tx = obj as BrexTransaction;
  return (
    typeof tx === 'object' &&
    tx !== null &&
    typeof tx.id === 'string' &&
    typeof tx.date === 'string' &&
    typeof tx.description === 'string' &&
    typeof tx.amount === 'object' &&
    typeof tx.amount.amount === 'number' &&
    typeof tx.amount.currency === 'string' &&
    typeof tx.status === 'string' &&
    typeof tx.type === 'string' &&
    typeof tx.accountId === 'string'
  );
}; 