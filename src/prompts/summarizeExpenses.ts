/**
 * @file Summarize Expenses Prompt
 * @version 1.0.0
 * @description Implementation of the summarize_expenses prompt for the Brex MCP server
 */

import { BrexClient } from "../services/brex/client.js";
import { logDebug, logError } from "../utils/logger.js";
import { ExpenseType, ExpenseStatus } from "../services/brex/expenses-types.js";

// Get Brex client
function getBrexClient(): BrexClient {
  return new BrexClient();
}

/**
 * Implements the summarize_expenses prompt
 * @returns The prompt messages for summarizing expenses
 */
export async function summarizeExpenses() {
  try {
    const brexClient = getBrexClient();
    
    // Get both card and reimbursement expenses
    const [cardExpenses, reimbursementExpenses] = await Promise.all([
      brexClient.getExpenses({ expense_type: [ExpenseType.CARD], limit: 50 }),
      brexClient.getExpenses({ expense_type: [ExpenseType.REIMBURSEMENT], limit: 50 })
    ]);
    
    // Create embedded resources for both expense types
    const embeddedResources = [
      {
        type: "resource" as const,
        resource: {
          uri: "brex://expenses/card",
          mimeType: "application/json",
          text: JSON.stringify(cardExpenses.items, null, 2)
        }
      },
      {
        type: "resource" as const,
        resource: {
          uri: "brex://expenses",
          mimeType: "application/json",
          text: JSON.stringify(reimbursementExpenses.items, null, 2)
        }
      }
    ];

    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: "Please analyze the following Brex expenses:"
          }
        },
        ...embeddedResources.map(resource => ({
          role: "user" as const,
          content: resource
        })),
        {
          role: "user",
          content: {
            type: "text",
            text: "Provide a summary of expenses, including:\n" +
                  "1. Total amount by expense type (card vs reimbursement)\n" +
                  "2. Breakdown by expense status\n" +
                  "3. Top merchants or vendors by spend\n" +
                  "4. Any notable patterns or unusual expenses"
          }
        }
      ]
    };
  } catch (error) {
    logError(`Error in summarize_expenses prompt: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
} 