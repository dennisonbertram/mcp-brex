# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2025-10-18

### Added
- **Comprehensive Tool Schemas**: All 21 tools now include detailed `inputSchema` definitions with actual parameter properties, types, enums, constraints, and descriptions
- **142 enum values** exposed across all tools (expense_type, status, payment_status, etc.)
- **122 parameter descriptions** with complete type information and usage guidance
- **Descriptive Tool Descriptions**: Enhanced all tool descriptions from generic "Tool: {name}" to comprehensive 1-2 sentence explanations of purpose, features, and limitations
- **Resource Query Parameter Documentation**: All 20 resources now document support for `?summary_only=true` and `&fields=field1,field2` query parameters with examples
- **API Documentation**: Complete Brex API reference documentation (docs/documentation/brex-api/API.md)
- **Implementation Plan**: Detailed improvement plan with research findings (docs/plan/001-improve-discoverability/)

### Changed
- Tool schemas transformed from generic `{"type":"object","properties":{},"additionalProperties":true}` to specific schemas with actual parameter definitions
- Tool descriptions improved from 3-word generic descriptions to 34-word average comprehensive descriptions (+1,033% improvement)
- All resource descriptions enhanced with query parameter documentation and dot notation examples
- Discoverability score improved from 1/10 to 10/10
- Overall server grade improved from B+ to A+

### Technical Details
- All changes are metadata-only with zero breaking changes
- Maintains backward compatibility with `additionalProperties: true` in all schemas
- Uses actual enum values from codebase type definitions (ExpenseType, ExpenseStatus, ExpensePaymentStatus)
- Includes important notes in descriptions (e.g., "Does not support posted_at_start or expand parameters")
- Marks write operations clearly: "NOTE: This is a write operation"
- Documents deprecations: "Deprecated - use get_expense instead"

### Impact
- LLM agents can now discover tool parameters without external documentation
- Tool usage is fully autonomous without requiring README consultation
- Parameter types, constraints, and enums are discoverable through MCP protocol
- Could serve as reference implementation for other MCP servers

### Testing
- Comprehensive verification testing performed (docs/testing/logs/mcp-test-verification-2025-10-18-160420.md)
- All 21 tools verified with proper schemas (100% success rate)
- All 20 resources verified with query parameter documentation (100% success rate)
- Zero breaking changes detected in functional testing
- TypeScript strict mode compliance maintained
- All builds and tests passing

## [0.3.2] - 2025-09-24

### Fixed
- Tools discovery in clients like Claude Code by including a permissive `inputSchema` in the tools list response. This ensures tools render and are callable in the UI.

### Changed
- Bumped server/package version to `0.3.2`.
- README updated with “What’s New (0.3.2)” describing the fix.

### Notes
- No behavior changes to individual tool handlers; only listing metadata was adjusted to improve client compatibility.

## [0.3.0] - 2025-09-24

### Added
- E2E framework with MCP client helper, and documentation (docs/server-improvement/testing/e2e-plan.md)
- Descriptive resource capability registrations (expenses, card-expenses, accounts, transactions, budgets, spend limits, budget programs)

### Changed
- Centralized ReadResource dispatcher owns routing (removed router.ts)
- Server capabilities enriched (resources/tools/prompts listChanged, logging)
- Card/Cash transactions tools no longer advertise unsupported params (posted_at_start, expand)

### Fixed
- Do not send unsupported posted_at_start/expand to card/cash transactions (avoid 400s)
- Optional client-side date filtering for transactions URIs
- Improved tests across unit, integration, and E2E; all pass

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
## [0.3.1] - 2025-09-24

### Added
- Tests covering money annotations and summaries for all major tools:
  - get_all_expenses, get_all_card_expenses, get_card_transactions, get_cash_transactions
- Documentation: Money & Units guide (docs/server-improvement/money/annotations.md)
- Testing extensions summary (docs/server-improvement/testing/extensions.md)

### Changed
- ListTools: replaced brittle static schema with programmatic listing derived from registered handlers
- README: updated examples and added Money & Units section; clarified transaction parameter support
- Usage doc: clarified that card/cash transactions do not support date filtering or expand; added client-side filtering guidance

### Fixed
- TypeScript parse errors in tools listing caused by large static array drift
