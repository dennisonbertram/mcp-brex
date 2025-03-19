/**
 * @file Brex Expenses API Types
 * @version 1.0.0
 * @lastModified 2024-03-19
 * 
 * Type definitions for Brex Expenses API
 * 
 * IMPORTANT:
 * - Add tests when adding new types
 * - Keep in sync with Brex API documentation
 * 
 * Functionality:
 * - Type definitions for Brex Expenses API
 * - Type guards and validation
 */

import { BrexPaginatedResponse } from './types.js';
import { logWarn, logDebug } from '../../utils/logger.js';

// Basic types
export interface Money {
  amount: number;
  currency?: string;
}

export enum ExpenseType {
  CARD = 'CARD',
  BILLPAY = 'BILLPAY',
  REIMBURSEMENT = 'REIMBURSEMENT',
  CLAWBACK = 'CLAWBACK',
  UNSET = 'UNSET',
}

export enum ExpenseStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  OUT_OF_POLICY = 'OUT_OF_POLICY',
  VOID = 'VOID',
  CANCELED = 'CANCELED',
  SPLIT = 'SPLIT',
  SETTLED = 'SETTLED',
}

export enum ExpensePaymentStatus {
  NOT_STARTED = 'NOT_STARTED',
  PROCESSING = 'PROCESSING',
  CANCELED = 'CANCELED',
  DECLINED = 'DECLINED',
  CLEARED = 'CLEARED',
  REFUNDING = 'REFUNDING',
  REFUNDED = 'REFUNDED',
  CASH_ADVANCE = 'CASH_ADVANCE',
  CREDITED = 'CREDITED',
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  SCHEDULED = 'SCHEDULED',
}

export enum Category {
  ADVERTISING_AND_MARKETING = 'ADVERTISING_AND_MARKETING',
  GROCERY = 'GROCERY',
  TELEPHONY = 'TELEPHONY',
  OFFICE_SUPPLIES = 'OFFICE_SUPPLIES',
  PRIVATE_AIR_TRAVEL = 'PRIVATE_AIR_TRAVEL',
  CLOTHING = 'CLOTHING',
  CAR_RENTAL = 'CAR_RENTAL',
  VEHICLE_EXPENSES = 'VEHICLE_EXPENSES',
  RESTAURANTS = 'RESTAURANTS',
  GAMBLING = 'GAMBLING',
  FLOWERS = 'FLOWERS',
  ELECTRONICS = 'ELECTRONICS',
  LEGAL_SERVICES = 'LEGAL_SERVICES',
  UTILITIES = 'UTILITIES',
  FURNITURE = 'FURNITURE',
  BARS_AND_NIGHTLIFE = 'BARS_AND_NIGHTLIFE',
  LAUNDRY = 'LAUNDRY',
  EVENT_EXPENSES = 'EVENT_EXPENSES',
  SHIPPING = 'SHIPPING',
  OTHER_TRAVEL_EXPENSES = 'OTHER_TRAVEL_EXPENSES',
  CHARITY = 'CHARITY',
  SOFTWARE_NON_RECURRING = 'SOFTWARE_NON_RECURRING',
  LODGING = 'LODGING',
  FACILITIES_EXPENSES = 'FACILITIES_EXPENSES',
  SERVERS = 'SERVERS',
  CONFERENCES = 'CONFERENCES',
  FOOD_DELIVERY = 'FOOD_DELIVERY',
  RENT = 'RENT',
  AIRLINE_EXPENSES = 'AIRLINE_EXPENSES',
  OTHER_BUSINESS_EXPENSES = 'OTHER_BUSINESS_EXPENSES',
  BANK_AND_FINANCIAL_FEES = 'BANK_AND_FINANCIAL_FEES',
  BOOKS_AND_NEWSPAPERS = 'BOOKS_AND_NEWSPAPERS',
  CONSULTANT_AND_CONTRACTOR = 'CONSULTANT_AND_CONTRACTOR',
  CORPORATE_INSURANCE = 'CORPORATE_INSURANCE',
  DIGITAL_GOODS = 'DIGITAL_GOODS',
  FEES_AND_LICENSES_AND_TAXES = 'FEES_AND_LICENSES_AND_TAXES',
  GAS_AND_FUEL = 'GAS_AND_FUEL',
  GENERAL_MERCHANDISE = 'GENERAL_MERCHANDISE',
  MEDICAL = 'MEDICAL',
  MEMBERSHIPS_AND_CLUBS = 'MEMBERSHIPS_AND_CLUBS',
  PARKING_EXPENSES = 'PARKING_EXPENSES',
  POLITICAL_DONATIONS = 'POLITICAL_DONATIONS',
  PUBLIC_TRANSPORTATION = 'PUBLIC_TRANSPORTATION',
  RECURRING_SOFTWARE_AND_SAAS = 'RECURRING_SOFTWARE_AND_SAAS',
  RIDESHARE_AND_TAXI = 'RIDESHARE_AND_TAXI',
  TOLL_AND_BRIDGE_FEES = 'TOLL_AND_BRIDGE_FEES',
  TRAINING_AND_EDUCATION = 'TRAINING_AND_EDUCATION',
  TRAVEL_WIFI = 'TRAVEL_WIFI',
}

// Entity interfaces
export interface Merchant {
  raw_descriptor: string;
  mcc: string;
  country: string;
}

export interface Location {
  country?: string;
  state?: string;
  city?: string;
  postal_code?: string;
  timezone?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  line1?: string;
  line2?: string;
}

export interface CustomerLocation {
  id: string;
  name: string;
}

export interface Department {
  id: string;
  name: string;
}

export interface Receipt {
  id: string;
  download_uris?: string[];
}

export interface Budget {
  id: string;
  name: string;
}

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  department_id?: string;
  location_id?: string;
}

export interface LegalEntity {
  id: string;
  display_name: string;
  billing_address: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    phone_number?: string;
  };
  created_at: string;
  status: 'UNSUBMITTED' | 'UNVERIFIED' | 'IN_PROGRESS' | 'VERIFIED' | 'REJECTED';
  is_default?: boolean;
}

export interface Payment {
  id: string;
  paymentInstrument: {
    type: string;
    id?: string;
  };
  statusReason: string;
}

export interface Review {
  compliance_status?: string;
  reviewers?: {
    reviewer?: User[];
    status?: string;
  };
  approver?: User;
  copilot_approver?: User;
  approved_at?: string;
}

export interface Repayment {
  repayment_initiated_by?: User;
  repayment_initiation_date?: string;
}

// Main Expense interface
export interface Expense {
  id: string;
  memo?: string;
  location_id?: string;
  location?: CustomerLocation;
  address?: Location;
  department_id?: string;
  department?: Department;
  updated_at: string;
  payment_posted_at?: string;
  category?: Category;
  merchant_id?: string;
  merchant?: Merchant;
  receipts?: Receipt[];
  budget_id?: string;
  budget?: Budget;
  expense_type?: ExpenseType;
  original_amount?: Money;
  billing_amount?: Money;
  budget_amount?: Money;
  purchased_amount?: Money;
  usd_equivalent_amount?: Money;
  purchased_at?: string;
  status?: ExpenseStatus;
  payment_status?: ExpensePaymentStatus;
  user_id?: string;
  user?: User;
  payment?: Payment;
  custom_fields?: any[]; // Simplified for now
  trip_id?: string;
  spending_entity_id?: string;
  spending_entity?: LegalEntity;
  billing_entity_id?: string;
  exported_at?: string;
  integration_spending_entity_id?: string;
  integration_billing_entity_id?: string;
  review?: Review;
  repayment?: Repayment;
  approved_at?: string;
  submitted_at?: string;
  completion_date?: string;
}

// Simplified Expense interface (non-expandable)
export interface SimpleExpense {
  id: string;
  memo?: string;
  location_id?: string;
  department_id?: string;
  updated_at: string;
  category?: Category;
  merchant_id?: string;
  budget_id?: string;
  original_amount?: Money;
  billing_amount?: Money;
  purchased_at?: string;
  status?: ExpenseStatus;
  payment_status?: ExpensePaymentStatus;
}

// Request and response types
export interface ListExpensesParams {
  expand?: string[];
  user_id?: string[];
  parent_expense_id?: string[];
  budget_id?: string[];
  spending_entity_id?: string[];
  expense_type?: ExpenseType[];
  status?: ExpenseStatus[];
  payment_status?: ExpensePaymentStatus[];
  purchased_at_start?: string;
  purchased_at_end?: string;
  updated_at_start?: string;
  updated_at_end?: string;
  load_custom_fields?: boolean;
  cursor?: string;
  limit?: number;
}

export interface UpdateExpenseRequest {
  memo?: string;
}

export interface ReceiptMatchRequest {
  receipt_name: string;
}

export interface ReceiptUploadRequest {
  receipt_name: string;
}

export interface CreateAsyncFileUploadResponse {
  id: string;
  uri: string;
}

export interface ExpensesResponse extends BrexPaginatedResponse<Expense> {}

// Type guards
export const isExpense = (obj: unknown): obj is Expense => {
  if (!obj || typeof obj !== 'object') {
    logDebug('Expense validation failed: Not an object');
    return false;
  }
  
  const expense = obj as Partial<Expense>;
  
  // Log the structure for debugging
  logDebug(`Validating expense with keys: ${Object.keys(expense).join(', ')}`);
  
  // Most lenient check - any object with something that identifies it
  // Either id, merchant_id, or spending_entity_id should be present
  const hasIdentifier = 
    typeof expense.id === 'string' || 
    typeof expense.merchant_id === 'string' || 
    typeof expense.spending_entity_id === 'string';
  
  if (!hasIdentifier) {
    logDebug('Expense validation warning: No identifier property found (id, merchant_id, or spending_entity_id)');
  }
  
  // We'll consider it a valid expense if it has any identifier
  return hasIdentifier;
};

export const isExpenseArray = (obj: unknown): obj is Expense[] => {
  if (!Array.isArray(obj)) {
    return false;
  }
  
  return obj.every(isExpense);
};

export const isMerchant = (obj: unknown): obj is Merchant => {
  const merchant = obj as Merchant;
  return (
    typeof merchant === 'object' &&
    merchant !== null &&
    typeof merchant.raw_descriptor === 'string' &&
    typeof merchant.mcc === 'string' &&
    typeof merchant.country === 'string'
  );
}; 