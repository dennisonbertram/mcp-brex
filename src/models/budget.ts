/**
 * @file Budget Models
 * @description TypeScript interfaces for the Brex Budget API
 */

import { Money } from './common';

/**
 * Period recurrence type for budgets
 */
export enum PeriodRecurrenceType {
  MONTHLY = 'MONTHLY', 
  QUARTERLY = 'QUARTERLY',
  ANNUAL = 'ANNUAL'
}

/**
 * Budget status
 */
export enum SpendBudgetStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  DRAFT = 'DRAFT'
}

/**
 * Budget limit type
 */
export enum LimitType {
  HARD = 'HARD',
  SOFT = 'SOFT'
}

/**
 * Base budget interface with common properties
 */
export interface BudgetBase {
  account_id: string;
  name: string;
  description?: string;
  parent_budget_id?: string;
  owner_user_ids?: string[];
  period_recurrence_type: PeriodRecurrenceType;
  start_date?: string;
  end_date?: string;
  amount: Money;
  limit_type?: LimitType;
}

/**
 * Budget interface with v2 properties
 */
export interface Budget extends BudgetBase {
  budget_id: string;
  spend_budget_status: SpendBudgetStatus;
  creator_user_id?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Budget creation request
 */
export interface CreateBudgetRequest extends BudgetBase {
  idempotency_key?: string;
}

/**
 * Budget update request
 */
export interface UpdateBudgetRequest {
  name?: string;
  description?: string;
  owner_user_ids?: string[];
  period_recurrence_type?: PeriodRecurrenceType;
  start_date?: string;
  end_date?: string;
  amount?: Money;
  limit_type?: LimitType;
  idempotency_key?: string;
}

/**
 * Budget list parameters
 */
export interface BudgetListParams {
  limit?: number;
  cursor?: string;
  parent_budget_id?: string;
  spend_budget_status?: SpendBudgetStatus;
}

/**
 * Budget list response
 */
export interface BudgetsResponse {
  items: Budget[];
  next_cursor?: string;
  has_more: boolean;
}

/**
 * Spend Limit Status
 */
export enum SpendLimitStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED'
}

/**
 * Authorization settings for spend limits
 */
export interface AuthorizationSettings {
  payment_types?: string[];
  merchant_categories?: string[];
  merchants?: string[];
  countries?: string[];
  spending_restrictions?: SpendingRestriction[];
}

/**
 * Spending restriction
 */
export interface SpendingRestriction {
  payment_type: string;
  limit_type: LimitType;
}

/**
 * Spend limit interface
 */
export interface SpendLimit {
  id: string;
  account_id: string;
  name: string;
  description?: string;
  parent_budget_id?: string;
  status: SpendLimitStatus;
  period_recurrence_type: PeriodRecurrenceType;
  start_date?: string;
  end_date?: string;
  authorization_settings: AuthorizationSettings;
  amount: Money;
  member_user_id?: string;
  creator_user_id?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Spend limit creation request
 */
export interface CreateSpendLimitRequest {
  account_id: string;
  name: string;
  description?: string;
  parent_budget_id?: string;
  period_recurrence_type: PeriodRecurrenceType;
  start_date?: string;
  end_date?: string;
  authorization_settings: AuthorizationSettings;
  amount: Money;
  member_user_id?: string;
  idempotency_key?: string;
}

/**
 * Spend limit update request
 */
export interface UpdateSpendLimitRequest {
  name?: string;
  description?: string;
  period_recurrence_type?: PeriodRecurrenceType;
  start_date?: string;
  end_date?: string;
  authorization_settings?: AuthorizationSettings;
  amount?: Money;
  idempotency_key?: string;
}

/**
 * Spend limit list parameters
 */
export interface SpendLimitListParams {
  limit?: number;
  cursor?: string;
  parent_budget_id?: string;
  status?: SpendLimitStatus;
  member_user_id?: string;
}

/**
 * Spend limit list response
 */
export interface SpendLimitsResponse {
  items: SpendLimit[];
  next_cursor?: string;
  has_more: boolean;
}

/**
 * Budget program status
 */
export enum BudgetProgramStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE'
}

/**
 * Budget blueprint
 */
export interface BudgetBlueprint {
  name: string;
  description?: string;
  period_recurrence_type: PeriodRecurrenceType;
  amount: Money;
  limit_type?: LimitType;
}

/**
 * Employee filter for budget programs
 */
export interface EmployeeFilter {
  departments?: string[];
  locations?: string[];
  titles?: string[];
  employee_ids?: string[];
}

/**
 * Budget program interface
 */
export interface BudgetProgram {
  id: string;
  name: string;
  description?: string;
  budget_blueprints: BudgetBlueprint[];
  existing_budget_ids?: string[];
  employee_filter?: EmployeeFilter;
  budget_program_status: BudgetProgramStatus;
  creator_user_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Budget program creation request
 */
export interface CreateBudgetProgramRequest {
  name: string;
  description?: string;
  budget_blueprints: BudgetBlueprint[];
  existing_budget_ids?: string[];
  employee_filter?: EmployeeFilter;
  idempotency_key?: string;
}

/**
 * Budget program update request
 */
export interface UpdateBudgetProgramRequest {
  name?: string;
  description?: string;
  budget_blueprints?: BudgetBlueprint[];
  existing_budget_ids?: string[];
  employee_filter?: EmployeeFilter;
  budget_program_status?: BudgetProgramStatus;
  idempotency_key?: string;
}

/**
 * Budget program list parameters
 */
export interface BudgetProgramListParams {
  limit?: number;
  cursor?: string;
  budget_program_status?: BudgetProgramStatus;
}

/**
 * Budget program list response
 */
export interface BudgetProgramsResponse {
  items: BudgetProgram[];
  next_cursor?: string;
  has_more: boolean;
}

/**
 * Type guard for Budget
 */
export function isBudget(obj: any): obj is Budget {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.budget_id === 'string' &&
    typeof obj.account_id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.period_recurrence_type === 'string' &&
    typeof obj.spend_budget_status === 'string' &&
    obj.amount &&
    typeof obj.amount.amount === 'number' &&
    typeof obj.amount.currency === 'string'
  );
}

/**
 * Type guard for SpendLimit
 */
export function isSpendLimit(obj: any): obj is SpendLimit {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.account_id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.period_recurrence_type === 'string' &&
    typeof obj.status === 'string' &&
    obj.authorization_settings &&
    obj.amount &&
    typeof obj.amount.amount === 'number' &&
    typeof obj.amount.currency === 'string'
  );
}

/**
 * Type guard for BudgetProgram
 */
export function isBudgetProgram(obj: any): obj is BudgetProgram {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    Array.isArray(obj.budget_blueprints) &&
    typeof obj.budget_program_status === 'string' &&
    typeof obj.creator_user_id === 'string' &&
    typeof obj.created_at === 'string' &&
    typeof obj.updated_at === 'string'
  );
} 