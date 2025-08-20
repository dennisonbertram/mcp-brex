/**
 * @file Usage Guide Resource
 * @description Exposes a docs resource the LLM can read to learn correct usage patterns
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const USAGE_URI = "brex://docs/usage";

function buildUsageDoc(): Record<string, unknown> {
  return {
    title: "Brex MCP Usage Guide",
    key_principles: [
      "Always pass parameters under arguments, not input",
      "Default to summary_only: true and provide a tight fields list",
      "Use date ranges and small windows (window_days) for large datasets",
      "Keep page_size <= 50 and max_items <= 500 for paginated tools",
      "Prefer get_all_* for pagination; use get_*_expense for single items",
      "Cash endpoints require cash scopes; card endpoints generally work by default"
    ],
    common_parameters: {
      summary_only: "boolean – project to compact fields to reduce payload size",
      fields: "string[] – dot-notation fields to include (e.g., purchased_amount.amount)",
      page_size: "number – items per page (<= 50)",
      max_items: "number – cap total items across pages (<= 500 recommended)",
      start_date: "ISO string – lower bound for updated_at",
      end_date: "ISO string – upper bound for updated_at",
      window_days: "number – split large date ranges into smaller windows (e.g., 7)",
      min_amount: "number – client-side minimum purchased_amount.amount",
      max_amount: "number – client-side maximum purchased_amount.amount"
    },
    tool_selection: [
      { tool: "get_all_card_expenses", use_for: "Paginated list of card expenses" },
      { tool: "get_card_expense", use_for: "One card expense by ID" },
      { tool: "get_all_expenses", use_for: "Paginated list of all expenses (with filters)" },
      { tool: "get_expenses", use_for: "Single-page list (small samples)" },
      { tool: "get_card_transactions", use_for: "Primary card transactions (use posted_at_start)" },
      { tool: "get_cash_transactions", use_for: "Cash transactions (requires cash scopes)" }
    ],
    recommended_patterns: [
      {
        name: "List recent card expenses (windowed)",
        request: {
          name: "get_all_card_expenses",
          arguments: {
            page_size: 50,
            max_items: 200,
            start_date: "2025-08-01T00:00:00Z",
            end_date: "2025-08-18T00:00:00Z",
            window_days: 7,
            min_amount: 100,
            summary_only: true,
            fields: [
              "id",
              "updated_at",
              "status",
              "purchased_amount.amount",
              "purchased_amount.currency",
              "merchant.raw_descriptor"
            ]
          }
        }
      },
      {
        name: "Small sample of expenses (single page)",
        request: {
          name: "get_expenses",
          arguments: {
            limit: 5,
            status: "APPROVED",
            summary_only: true,
            fields: ["id", "status", "purchased_amount.amount", "merchant.raw_descriptor"]
          }
        }
      },
      {
        name: "Card transactions (recent)",
        request: {
          name: "get_card_transactions",
          arguments: {
            limit: 10,
            posted_at_start: "2025-08-01T00:00:00Z",
            summary_only: true,
            fields: ["id", "posted_at", "amount.amount", "amount.currency", "merchant.raw_descriptor"]
          }
        }
      }
    ],
    anti_patterns: [
      "Do not omit date ranges on get_all_* for high-volume orgs",
      "Do not request large page_size (>50) or unlimited max_items",
      "Do not omit summary_only/fields when embedding results in prompts",
      "Do not call cash endpoints without verifying required scopes"
    ]
  };
}

export function registerUsageResource(server: Server): void {
  server.setRequestHandler(ReadResourceRequestSchema, async (request): Promise<any> => {
    const uri = request.params.uri;
    if (uri !== USAGE_URI) {
      return { handled: false } as any;
    }
    const body = buildUsageDoc();
    return {
      contents: [
        {
          uri: USAGE_URI,
          mimeType: "application/json",
          text: JSON.stringify(body, null, 2)
        }
      ]
    } as any;
  });
}


