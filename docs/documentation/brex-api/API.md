# Brex API Reference

**Source**: Context7 research from `/websites/developer_brex`
**Date**: 2025-10-18
**Trust Score**: 7.5/10
**Coverage**: 323 code snippets

---

## Overview

The Brex API provides access to Brex's unified spend platform, enabling developers to integrate corporate cards, expense management, and payments into their custom workflows.

**Base URL**: `https://platform.brexapis.com`

**Authentication**: OAuth2 Bearer token in `Authorization` header

**Money Representation**: All amounts are in **cents** (integer values)
- Example: `{ "amount": 700, "currency": "USD" }` = $7.00

---

## Expenses API

### List Expenses
**Endpoint**: `GET /v1/expenses`

**Purpose**: Retrieve a paginated list of expenses with optional filters

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cursor` | string | No | Pagination cursor from previous response |
| `limit` | number | No | Items per page (default: 50, max: 100) |
| `expand[]` | array<string> | No | Fields to expand: `merchant`, `budget`, `user`, `department`, `location`, `receipts` |
| `expense_type[]` | array<string> | No | Filter by type: `CARD`, `CASH` |
| `status[]` | array<string> | No | Filter by status: `APPROVED`, `PENDING`, `DECLINED`, `CANCELLED` |
| `payment_status[]` | array<string> | No | Filter by payment status: `NOT_STARTED`, `PENDING`, `PROCESSING`, `CLEARED`, `DECLINED`, `CANCELLED`, `REFUNDED`, `MATCHED` |

**Response Schema**:
```json
{
  "next_cursor": "string",
  "items": [
    {
      "id": "string",
      "memo": "string",
      "location_id": "string",
      "location": {
        "id": "string",
        "name": "string"
      },
      "department_id": "string",
      "department": {
        "id": "string",
        "name": "string"
      },
      "updated_at": "2019-08-24T14:15:22Z",
      "payment_posted_at": "2019-08-24T14:15:22Z",
      "category": "ADVERTISING_AND_MARKETING",
      "merchant_id": "string",
      "merchant": {
        "raw_descriptor": "string",
        "mcc": "string",
        "country": "string"
      },
      "receipts": [
        {
          "id": "string",
          "download_uris": ["string"]
        }
      ],
      "budget_id": "string",
      "budget": {
        "id": "string",
        "name": "string"
      },
      "expense_type": "CARD",
      "original_amount": {
        "amount": 700,
        "currency": "USD"
      },
      "billing_amount": {
        "amount": 700,
        "currency": "USD"
      },
      "purchased_amount": {
        "amount": 700,
        "currency": "USD"
      },
      "user_id": "string",
      "user": {
        "id": "string",
        "first_name": "string",
        "last_name": "string",
        "department_id": "string",
        "location_id": "string"
      },
      "status": "DRAFT",
      "payment_status": "NOT_STARTED"
    }
  ]
}
```

---

### List Card Expenses
**Endpoint**: `GET /v1/expenses/card`

**Purpose**: Retrieve card-specific expenses (similar to /v1/expenses but card-only)

**Query Parameters**: Same as List Expenses (except `expense_type[]` not needed)

**Response Schema**: Same as List Expenses

---

### Get Expense by ID
**Endpoint**: `GET /v1/expenses/{id}`

**Purpose**: Retrieve a single expense by its unique identifier

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Unique expense identifier |

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `expand[]` | array<string> | No | Fields to expand: `merchant`, `budget`, `user`, `department`, `location`, `receipts` |

**Response Schema**: Single expense object (same structure as items in List Expenses)

---

### Get Card Expense by ID (Deprecated)
**Endpoint**: `GET /v1/expenses/card/{expense_id}`

**Status**: Deprecated - use `GET /v1/expenses/{id}` instead

---

### Update Expense
**Endpoint**: `PUT /v1/expenses/card/{expense_id}`

**Purpose**: Update metadata for an existing card expense

**Request Body**:
```json
{
  "memo": "string"
}
```

**Response**: Updated expense object

---

### Upload Receipt
**Endpoint**: `POST /v1/expenses/card/{expense_id}/receipt_upload`

**Purpose**: Create a pre-signed S3 URL for uploading a receipt to an expense

**Request Body**:
```json
{
  "receipt_name": "string"
}
```

**Response**:
```json
{
  "s3_uri": "string",
  "upload_url": "string",
  "receipt_id": "string"
}
```

**Note**: Upload URL expires after 30 minutes

---

### Match Receipt
**Endpoint**: `POST /v1/expenses/card/receipt_match`

**Purpose**: Upload a receipt that will be automatically matched to existing expenses

**Request Body**:
```json
{
  "receipt_name": "string"
}
```

**Response**:
```json
{
  "s3_uri": "string",
  "upload_url": "string",
  "receipt_id": "string"
}
```

**Note**: System attempts automatic matching; expires after 30 minutes

---

## Budgets API

### List Budgets
**Endpoint**: `GET /v2/budgets`

**Purpose**: Retrieve a paginated list of budgets

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cursor` | string | No | Pagination cursor |
| `limit` | number | No | Items per page (default: 50, max: 100) |
| `parent_budget_id` | string | No | Filter by parent budget |
| `spend_budget_status` | string | No | Filter by status: `ACTIVE`, `ARCHIVED`, `DRAFT` |

**Response Schema**:
```json
{
  "next_cursor": "string",
  "items": [
    {
      "id": "string",
      "account_id": "string",
      "name": "string",
      "description": "string",
      "parent_budget_id": "string",
      "owner_user_ids": ["string"],
      "period_recurrence_type": "MONTHLY",
      "amount": {
        "amount": 700,
        "currency": "USD"
      },
      "limit_type": "HARD",
      "start_date": "2019-08-24",
      "end_date": "2019-08-24",
      "status": "ACTIVE"
    }
  ]
}
```

---

### Get Budget by ID
**Endpoint**: `GET /v2/budgets/{id}`

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Budget identifier |

**Response**: Single budget object

---

### Create Budget
**Endpoint**: `POST /v2/budgets`

**Headers**: Requires `Idempotency-Key`

**Request Body**:
```json
{
  "name": "string",
  "description": "string",
  "parent_budget_id": "string",
  "owner_user_ids": ["string"],
  "period_recurrence_type": "MONTHLY",
  "amount": {
    "amount": 700,
    "currency": "USD"
  },
  "limit_type": "HARD",
  "start_date": "2019-08-24",
  "end_date": "2019-08-24"
}
```

---

### Update Budget
**Endpoint**: `PUT /v2/budgets/{id}`

**Headers**: Requires `Idempotency-Key`

**Request Body**: Same as Create Budget

**Response**: Updated budget object

---

## Spend Limits API

### List Spend Limits
**Endpoint**: `GET /v2/spend_limits`

**Purpose**: Retrieve a paginated list of spend limits

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cursor` | string | No | Pagination cursor |
| `limit` | number | No | Items per page (default: 50, max: 100) |
| `member_user_id[]` | array<string> | No | Filter by member user IDs |
| `parent_budget_id` | string | No | Filter by parent budget |
| `status` | string | No | Filter by status: `ACTIVE`, `ARCHIVED` |

**Response Schema**:
```json
{
  "next_cursor": "string",
  "items": [
    {
      "id": "string",
      "account_id": "string",
      "name": "string",
      "description": "string",
      "parent_budget_id": "string",
      "status": "ACTIVE",
      "period_recurrence_type": "PER_WEEK",
      "start_date": "2019-08-24",
      "end_date": "2019-08-24",
      "start_time_utc": "2019-08-24T14:15:22Z",
      "end_time_utc": "2019-08-24T14:15:22Z",
      "authorization_settings": {
        "base_limit": {
          "amount": 700,
          "currency": "USD"
        },
        "limit_buffer_percentage": 0,
        "authorization_type": "HARD",
        "rollover_refresh_rate": "OFF",
        "limit_with_increases": {
          "amount": 700,
          "currency": "USD"
        }
      },
      "expense_visibility": "SHARED",
      "authorization_visibility": "PUBLIC",
      "merchant_category_controls": {
        "allowed_merchant_categories": ["ADVERTISING_MARKETING"],
        "blocked_merchant_categories": ["ADVERTISING_MARKETING"]
      },
      "transaction_limit": {
        "amount": 700,
        "currency": "USD"
      }
    }
  ]
}
```

---

### Get Spend Limit by ID
**Endpoint**: `GET /v2/spend_limits/{id}`

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Spend limit identifier |

**Response**: Single spend limit object

---

### Create Spend Limit
**Endpoint**: `POST /v2/spend_limits`

**Headers**: Requires `Idempotency-Key`

**Request Body**:
```json
{
  "name": "string",
  "description": "string",
  "parent_budget_id": "string",
  "period_recurrence_type": "PER_WEEK",
  "start_date": "2019-08-24",
  "end_date": "2019-08-24",
  "authorization_settings": {
    "base_limit": {
      "amount": 700,
      "currency": "USD"
    },
    "limit_buffer_percentage": 0,
    "authorization_type": "HARD",
    "rollover_refresh_rate": "OFF"
  },
  "expense_visibility": "SHARED",
  "authorization_visibility": "PUBLIC",
  "transaction_limit": {
    "amount": 700,
    "currency": "USD"
  }
}
```

---

### Update Spend Limit
**Endpoint**: `PUT /v2/spend_limits/{id}`

**Request Body**: Same as Create Spend Limit

---

### Archive Spend Limit
**Endpoint**: `POST /v2/spend_limits/{id}/archive`

**Purpose**: Archive a spend limit (makes it unusable and removes from UI)

**Response**: Archived spend limit object

---

## Budget Programs API

### List Budget Programs
**Endpoint**: `GET /v1/budget_programs`

**Purpose**: Retrieve a paginated list of budget programs

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cursor` | string | No | Pagination cursor |
| `limit` | number | No | Items per page |
| `budget_program_status` | string | No | Filter by status: `ACTIVE`, `INACTIVE` |

**Response Schema**:
```json
{
  "next_cursor": "string",
  "items": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "status": "ACTIVE",
      "employee_filter": {
        "employment_status": "EMPLOYMENT_STATUS_ACTIVE",
        "employment_type": "EMPLOYMENT_TYPE_FULL_TIME"
      },
      "budget_blueprints": [
        {
          "name": "string",
          "description": "string",
          "parent_budget_id": "string",
          "owner_user_ids": ["string"],
          "period_type": "WEEKLY",
          "start_date": "2019-08-24",
          "end_date": "2019-08-24",
          "limit": {
            "amount": 700,
            "currency": "USD"
          }
        }
      ]
    }
  ]
}
```

---

### Get Budget Program by ID
**Endpoint**: `GET /v1/budget_programs/{id}`

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Budget program identifier |

**Response**: Single budget program object

---

### Create Budget Program
**Endpoint**: `POST /v1/budget_programs`

**Headers**: Requires `Idempotency-Key`

**Request Body**:
```json
{
  "name": "string",
  "description": "string",
  "existing_budget_ids": ["string"],
  "budget_blueprints": [...],
  "employee_filter": {
    "employment_status": "EMPLOYMENT_STATUS_ACTIVE",
    "employment_type": "EMPLOYMENT_TYPE_FULL_TIME"
  }
}
```

---

## Transactions API

### List Card Transactions (Primary)
**Endpoint**: `GET /v2/transactions/card/primary`

**Purpose**: Retrieve settled transactions for all card accounts

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cursor` | string | No | Pagination cursor |
| `limit` | number | No | Items per page (default: 50, max: 100) |
| `user_ids[]` | array<string> | No | Filter by user IDs |

**IMPORTANT**: This endpoint does **NOT** support:
- `posted_at_start` - Must filter client-side by `posted_at_date` field
- `expand[]` - No expansion available

**Response Schema**:
```json
{
  "next_cursor": "string",
  "items": [
    {
      "id": "string",
      "card_id": "string",
      "description": "string",
      "amount": {
        "amount": 11759,
        "currency": "USD"
      },
      "initiated_at_date": "2025-10-17",
      "posted_at_date": "2025-10-18",
      "type": "PURCHASE",
      "merchant": {
        "raw_descriptor": "string",
        "mcc": "string",
        "country": "string"
      }
    }
  ]
}
```

---

### List Cash Transactions
**Endpoint**: `GET /v2/transactions/cash/{account_id}`

**Purpose**: Retrieve settled transactions for a specific cash account

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_id` | string | Yes | Cash account identifier |

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cursor` | string | No | Pagination cursor |
| `limit` | number | No | Items per page |

**IMPORTANT**:
- Requires cash account scopes
- Does **NOT** support `posted_at_start` or `expand[]`

**Response Schema**: Similar to card transactions

---

### List Card Account Statements (Primary)
**Endpoint**: `GET /v2/accounts/card/primary/statements`

**Purpose**: Retrieve finalized statements for primary card account

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cursor` | string | No | Pagination cursor |
| `limit` | number | No | Items per page |

**Response Schema**:
```json
{
  "next_cursor": "string",
  "items": [
    {
      "id": "string",
      "start_date": "2019-08-24",
      "end_date": "2019-08-24",
      "payment_due_date": "2019-08-24",
      "statement_balance": {
        "amount": 700,
        "currency": "USD"
      }
    }
  ]
}
```

---

### List Cash Account Statements
**Endpoint**: `GET /v2/accounts/cash/{account_id}/statements`

**Purpose**: Retrieve finalized statements for a specific cash account

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_id` | string | Yes | Cash account identifier |

**Query Parameters**: Same as card statements

**IMPORTANT**: Requires cash account scopes

---

## Accounts API

### List All Accounts
**Endpoint**: `GET /v2/accounts`

**Purpose**: Retrieve all card and cash accounts

**Response Schema**:
```json
{
  "items": [
    {
      "id": "string",
      "name": "string",
      "type": "CARD",
      "currency": "USD",
      "current_balance": {
        "amount": 700,
        "currency": "USD"
      },
      "available_balance": {
        "amount": 700,
        "currency": "USD"
      },
      "status": "ACTIVE"
    }
  ]
}
```

---

### List Card Accounts
**Endpoint**: `GET /v2/accounts/card`

**Purpose**: Retrieve all card accounts

**Response Schema**: Filtered account list (card accounts only)

---

### List Cash Accounts
**Endpoint**: `GET /v2/accounts/cash`

**Purpose**: Retrieve all cash accounts

**IMPORTANT**: Requires cash account scopes

**Response Schema**: Filtered account list (cash accounts only)

---

### Get Account Details
**Endpoint**: `GET /v2/accounts/{account_id}`

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_id` | string | Yes | Account identifier |

**Response**: Single account object

---

## Common Patterns

### Pagination
All list endpoints use **cursor-based pagination**:
- `cursor` parameter accepts cursor from previous response's `next_cursor`
- `limit` parameter controls items per page (typically max 100)
- Response includes `next_cursor` (null when no more pages)

### Expansion
Many endpoints support `expand[]` parameter:
- `merchant` - Include full merchant details
- `budget` - Include full budget details
- `user` - Include full user details
- `department` - Include department details
- `location` - Include location details
- `receipts` - Include receipt download URIs

**Exception**: Transaction endpoints do NOT support expansion

### Date Filtering
- Date parameters use ISO 8601 format: `2019-08-24` or `2019-08-24T14:15:22Z`
- Some endpoints support date range filtering
- Transaction endpoints do NOT support `posted_at_start` - filter client-side instead

### Error Responses
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient scopes)
- `404` - Not Found (resource doesn't exist)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## Scopes Required

| Endpoint Group | Required Scopes |
|----------------|----------------|
| Expenses (read) | `expenses:read` |
| Expenses (write) | `expenses:write` |
| Budgets (read) | `budgets:read` |
| Budgets (write) | `budgets:write` |
| Transactions (card) | `transactions.card.readonly` |
| Transactions (cash) | `transactions.cash.readonly` |
| Accounts (card) | Default (usually included) |
| Accounts (cash) | `accounts.cash.readonly` |

---

## Rate Limits

Brex enforces rate limiting on API requests. When exceeded, returns HTTP 429 with `Retry-After` header.

**Best Practices**:
- Use pagination to limit response sizes
- Implement exponential backoff on 429 responses
- Cache frequently-accessed data
- Use date range filters to reduce data volume

---

## Webhooks

Brex supports webhooks for real-time event notifications:

**Event Types**:
- `EXPENSE_PAYMENT_UPDATED` - Expense payment status changed

**Webhook Payload Example**:
```json
{
  "event_type": "EXPENSE_PAYMENT_UPDATED",
  "expense_id": "string",
  "payment_status": "PENDING",
  "payment_type": "PURCHASE",
  "company_id": "string",
  "amount": {
    "amount": 1030,
    "currency": "USD"
  },
  "payment_description": "string"
}
```

---

## Notes

1. **All amounts are in cents** - Never assume dollars
2. **Transactions have limited filtering** - No `posted_at_start` or `expand`
3. **Cash endpoints require special scopes** - Handle 403s gracefully
4. **Idempotency keys required for writes** - Prevents duplicate operations
5. **Expansion increases response size** - Use sparingly, default to `[]`
