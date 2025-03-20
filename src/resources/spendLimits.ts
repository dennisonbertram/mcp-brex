/**
 * @file Spend Limits Resource Handler
 * @description Implements resource handlers for Brex spend limits API endpoints
 */

import { ReadResourceRequestSchema } from '@anthropic-ai/sdk';
import { logDebug, logError } from '../utils/logger.js';
import { ResourceTemplate } from '../models/resourceTemplate.js';
import { getBrexClient } from '../services/brex/index.js';
import { parseQueryParams } from '../models/common.js';
import { isSpendLimit } from '../models/budget.js';

/**
 * Resource template for spend limits API
 */
const spendLimitsTemplate = new ResourceTemplate('brex://spend_limits{/id}');

/**
 * Register the spend limits resource handler
 * @param server - MCP server instance
 */
export const registerSpendLimitsResource = (server: any) => {
  server.setRequestHandler(ReadResourceRequestSchema, async (request: any, extra: any) => {
    const { uri } = request;
    
    // Check if we can handle this URI
    if (!uri.startsWith('brex://spend_limits')) {
      return { handled: false };
    }
    
    logDebug(`Handling spend limit request for URI: ${uri}`);
    
    try {
      const brexClient = getBrexClient();
      const match = spendLimitsTemplate.match(uri);
      const id = match?.id;
      
      if (id) {
        // Get single spend limit
        logDebug(`Fetching single spend limit with ID: ${id}`);
        const spendLimit = await brexClient.getSpendLimit(id);
        
        if (!spendLimit || !isSpendLimit(spendLimit)) {
          throw new Error(`Invalid spend limit data received for ID: ${id}`);
        }
        
        return {
          handled: true,
          resource: spendLimit
        };
      } else {
        // List spend limits with pagination
        logDebug('Fetching spend limits list');
        const params = parseQueryParams(uri);
        const spendLimitsResponse = await brexClient.getSpendLimits({
          cursor: params.cursor,
          limit: params.limit ? parseInt(params.limit, 10) : undefined,
          parent_budget_id: params.parent_budget_id,
          status: params.status as any,
          member_user_id: params.member_user_id
        });
        
        return {
          handled: true,
          resource: spendLimitsResponse,
        };
      }
    } catch (error) {
      logError(`Error handling spend limit request: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });
};

export default registerSpendLimitsResource; 