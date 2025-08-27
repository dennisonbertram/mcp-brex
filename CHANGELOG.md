# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-08-27

### Fixed
- **Response Size Issue**: Resolved critical issue where `limit=1` requests were returning 26K+ tokens instead of small responses
- **Infinite Pagination Bug**: Fixed `get_all_expenses` tool that was making unlimited API calls when no `max_items` specified (changed default from `Infinity` to `100`)
- **Card Transactions Expand Error**: Fixed 400 "Unsupported entity expansion" errors when using `expand=["merchant"]` parameter with `get_card_transactions`
- **Account Details 403 Errors**: Implemented smart routing to handle both cash and card account IDs correctly
  - Cash accounts (`dpacc_*`): Use `/v2/accounts/cash/{id}` endpoint
  - Card accounts (`cuacc_*`): Use `/v2/accounts/card` list endpoint with filtering
- **Forced Merchant Expansion**: Removed forced `expand=["merchant"]` parameter that was causing large responses
- **Array Parameter Handling**: Fixed falsy array evaluation bug (`if (params.expand)` vs `if (params.expand !== undefined)`)

### Enhanced
- **Account Management**: Both cash and card accounts now fully supported across all account-related tools
- **Transaction Retrieval**: Smart routing for transaction endpoints based on account type
- **Error Handling**: Improved error messages and handling for invalid account IDs
- **Response Optimization**: All tools now return appropriately sized responses under token limits

### Changed
- **Default Pagination**: `get_all_expenses` now defaults to maximum 100 items instead of unlimited
- **API Endpoints**: Updated to use correct Brex API v2 endpoints for better compatibility
- **Parameter Validation**: Enhanced validation for account IDs and expand parameters

### Technical
- **API Client**: Completely refactored `BrexClient` class with smart routing logic
- **Type Safety**: Improved TypeScript types and interfaces for better development experience
- **Production Build**: Optimized production build with development files excluded

## [0.1.1] - Previous Version

### Added
- Initial MCP server implementation for Brex API
- Basic expense, budget, and transaction tools
- Authentication and API key management