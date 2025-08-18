/**
 * @file Update Expense Tool
 * @version 1.0.0
 * @description Implementation of the update_expense tool for the Brex MCP server
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { BrexClient } from "../services/brex/client.js";
import { logDebug, logError } from "../utils/logger.js";
import { registerToolHandler } from "./index.js";

// Get Brex client
function getBrexClient(): BrexClient {
  return new BrexClient();
}

/**
 * Interface for update_expense tool input parameters
 */
interface UpdateExpenseParams {
  expense_id: string;
  memo?: string;
  category?: string;
  budget_id?: string;
  department_id?: string;
  location_id?: string;
  custom_fields?: Array<{
    key: string;
    value: any;
  }>;
}

/**
 * Interface for expense update response
 */
interface UpdateExpenseResponse {
  id: string;
  memo?: string;
  category?: string;
  budget_id?: string;
  department_id?: string;
  location_id?: string;
  updated_at: string;
  status: string;
}

/**
 * Helper function to update an expense
 * @param client The Brex client
 * @param expenseId The ID of the expense to update
 * @param updateData The data to update on the expense
 * @returns Updated expense data
 */
async function updateExpense(
  client: BrexClient, 
  expenseId: string, 
  updateData: Omit<UpdateExpenseParams, 'expense_id'>
): Promise<UpdateExpenseResponse> {
  try {
    logDebug(`Updating expense with ID: ${expenseId}`);
    
    // Make API call to Brex to update the expense
    const response = await client.put(`/v1/expenses/card/${expenseId}`, updateData);
    
    // Validate the response
    if (!response || !response.id) {
      throw new Error("Invalid response from expense update request");
    }
    
    return response;
  } catch (error) {
    logError(`Failed to update expense: ${error instanceof Error ? error.message : String(error)}`);
    throw new Error(`Expense update failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Validates and processes the update_expense tool parameters
 * @param input The raw input parameters from the tool call
 * @returns Validated parameters
 */
function validateParams(input: any): UpdateExpenseParams {
  if (!input) {
    throw new Error("Missing parameters");
  }
  
  if (!input.expense_id) {
    throw new Error("Missing required parameter: expense_id");
  }
  
  // At least one update field is required
  if (!input.memo && !input.category && !input.budget_id && 
      !input.department_id && !input.location_id && !input.custom_fields) {
    throw new Error("At least one update field is required (memo, category, budget_id, department_id, location_id, or custom_fields)");
  }
  
  const params: UpdateExpenseParams = {
    expense_id: input.expense_id,
    memo: input.memo,
    category: input.category,
    budget_id: input.budget_id,
    department_id: input.department_id,
    location_id: input.location_id,
    custom_fields: input.custom_fields
  };
  
  return params;
}

/**
 * Registers the update_expense tool with the server
 * @param server The MCP server instance
 */
export function registerUpdateExpense(server: Server): void {
  registerToolHandler("update_expense", async (request) => {
    try {
      // Validate parameters
      const params = validateParams(request.params.arguments);
      logDebug(`Updating expense with ID: ${params.expense_id}`);
      
      // Get Brex client
      const brexClient = getBrexClient();
      
      try {
        // Extract the update data (everything except the expense_id)
        const { expense_id, ...updateData } = params;
        
        // Update the expense
        const updateResult = await updateExpense(brexClient, expense_id, updateData);
        
        logDebug(`Successfully updated expense with ID: ${updateResult.id}`);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "success",
              expense_id: updateResult.id,
              updated_at: updateResult.updated_at,
              expense_status: updateResult.status,
              updated_fields: Object.keys(updateData).filter(key => updateData[key as keyof typeof updateData] !== undefined),
              message: `Expense ${updateResult.id} was updated successfully.`
            }, null, 2)
          }]
        };
      } catch (apiError) {
        logError(`Error updating expense: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
        throw new Error(`Failed to update expense: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
      }
    } catch (error) {
      logError(`Error in update_expense tool: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });
} 