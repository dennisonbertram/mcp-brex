# Refactoring Plan for the Brex MCP Server

## Overview

This document outlines the refactoring plan for restructuring the Brex MCP Server codebase. The main goal is to improve maintainability by breaking down the monolithic `index.ts` file into smaller, more focused modules.

## Current Structure

The current implementation has most of the code in a single `index.ts` file (~756 lines), which handles:

- Resource templates and URI parsing
- Server initialization and configuration
- Resource handlers (accounts, expenses, card expenses)
- Tool implementations
- Prompt definitions

## Refactoring Goals

1. Separate concerns into individual files
2. Improve code maintainability and readability
3. Make it easier to extend and add new functionality
4. Preserve the existing functionality and API contracts

## Proposed Directory Structure

```
src/
├── index.ts                    # Entry point - minimal server setup
├── config/                     # Configuration files
├── services/                   # External services (Brex API client, etc.)
├── utils/                      # Utility functions
├── models/                     # Type definitions and interfaces
│   └── resourceTemplate.ts     # Resource template implementation
├── resources/                  # Resource handlers
│   ├── index.ts                # Exports all resources
│   ├── accounts.ts             # Accounts resource handler
│   ├── expenses.ts             # Expenses resource handler
│   └── cardExpenses.ts         # Card expenses resource handler
├── tools/                      # Tool implementations
│   ├── index.ts                # Exports all tools
│   ├── getTransactions.ts      # Get transactions tool
│   ├── getExpenses.ts          # Get expenses tool
│   ├── getAccountDetails.ts    # Get account details tool
│   └── uploadReceipt.ts        # Upload receipt tool
└── prompts/                    # Prompt implementations
    ├── index.ts                # Exports all prompts
    ├── summarizeTransactions.ts # Transaction summary prompt
    └── summarizeExpenses.ts    # Expense summary prompt
```

## Implementation Plan

### Phase 1: Extract Utility Classes and Models

1. Move `ResourceTemplate` class to `src/models/resourceTemplate.ts`
2. Create resource template instances in their respective resource handler files

### Phase 2: Refactor Resource Handlers

1. Create individual files for each resource handler in `src/resources/`:
   - `accounts.ts`: Handle account-related resources
   - `expenses.ts`: Handle expense-related resources
   - `cardExpenses.ts`: Handle card expense-related resources
2. Create an index file to export all resource handlers

### Phase 3: Refactor Tool Implementations

1. Create individual files for each tool in `src/tools/`:
   - `getTransactions.ts`: Get transactions tool implementation
   - `getExpenses.ts`: Get expenses tool implementation
   - `getAccountDetails.ts`: Get account details tool implementation
   - `uploadReceipt.ts`: Upload receipt tool implementation
2. Create an index file to export all tools

### Phase 4: Refactor Prompt Implementations

1. Create individual files for each prompt in `src/prompts/`:
   - `summarizeTransactions.ts`: Transaction summary prompt implementation
   - `summarizeExpenses.ts`: Expense summary prompt implementation
2. Create an index file to export all prompts

### Phase 5: Update Main Index File

Refactor `index.ts` to:
1. Import and register all resources, tools, and prompts
2. Initialize the server with minimal code
3. Start the server

## Detailed Breakdown

### ResourceTemplate Class

Move to `src/models/resourceTemplate.ts`:
- Full implementation of ResourceTemplate class
- Export the class for use in resource handlers

### Resource Handlers

#### accounts.ts
- Account resource template definition
- List accounts handler
- Get specific account handler

#### expenses.ts
- Expense resource template definition
- List expenses handler
- Get specific expense handler

#### cardExpenses.ts
- Card expense resource template definition
- List card expenses handler
- Get specific card expense handler

### Tool Implementations

#### getTransactions.ts
- Implementation of get_transactions tool

#### getExpenses.ts
- Implementation of get_expenses tool

#### getAccountDetails.ts
- Implementation of get_account_details tool

#### uploadReceipt.ts
- Implementation of upload_receipt tool

### Prompt Implementations

#### summarizeTransactions.ts
- Implementation of summarize_transactions prompt

#### summarizeExpenses.ts
- Implementation of summarize_expenses prompt

## Testing Strategy

1. Ensure all existing functionality works after refactoring
2. Manual testing of each resource, tool, and prompt
3. Consider adding automated tests in a future phase

## Future Improvements

After completing this refactoring:

1. Add unit tests for individual components
2. Implement better error handling and recovery
3. Add more detailed documentation
4. Consider using dependency injection for easier testing 