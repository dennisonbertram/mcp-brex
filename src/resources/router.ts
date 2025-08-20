/**
 * @file Resources Router (targets expenses endpoints to avoid handler override issues)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { ResourceTemplate } from "../models/resourceTemplate.js";
import { BrexClient } from "../services/brex/client.js";
// Router uses BrexClient and response limiter; logs handled at higher layers
import { ListExpensesParams, isExpense, ExpenseType } from "../services/brex/expenses-types.js";
import { parseQueryParams } from "../models/common.js";
import { limitExpensesPayload } from "../utils/responseLimiter.js";

const expensesTemplate = new ResourceTemplate("brex://expenses{/id}");
const cardExpensesTemplate = new ResourceTemplate("brex://expenses/card{/id}");

function getClient(): BrexClient { return new BrexClient(); }

export function registerResourcesRouter(server: Server): void {
  // Register as the last handler to take precedence
  server.setRequestHandler(ReadResourceRequestSchema, async (request: unknown) => {
    const req = request as { params: { uri: string } };
    const uri = req.params.uri;

    // Route: expenses (non-card)
    if (uri.startsWith("brex://expenses") && !uri.includes("/card")) {
      const brex = getClient();
      const params = expensesTemplate.parse(uri);
      const qp = parseQueryParams(uri);
      const fields = qp.fields ? qp.fields.split(',').map(s => s.trim()).filter(Boolean) : undefined;
      const summaryOnly = qp.summary_only === 'true';
      if (!params.id) {
        const req: ListExpensesParams = { limit: 50, expand: ['merchant','budget'] };
        const resp = await brex.getExpenses(req);
        const limited = limitExpensesPayload(resp.items as any, { summaryOnly, fields, hardTokenLimit: 24000 });
        return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(limited.items, null, 2) }] } as any;
      } else {
        const exp = await brex.getExpense(params.id, { expand: ['merchant','budget','location','department','receipts.download_uris'], load_custom_fields: true });
        if (!isExpense(exp)) throw new Error('Invalid expense');
        const limited = limitExpensesPayload([exp] as any, { summaryOnly, fields, hardTokenLimit: 24000 });
        return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(limited.items[0] || {}, null, 2) }] } as any;
      }
    }

    // Route: card expenses
    if (uri.startsWith("brex://expenses/card")) {
      const brex = getClient();
      const params = cardExpensesTemplate.parse(uri);
      const qp = parseQueryParams(uri);
      const fields = qp.fields ? qp.fields.split(',').map(s => s.trim()).filter(Boolean) : undefined;
      const summaryOnly = qp.summary_only === 'true';
      if (!params.id) {
        const req: ListExpensesParams = { limit: 50, expand: ['merchant','budget'], expense_type: [ExpenseType.CARD] };
        const resp = await brex.getCardExpenses(req);
        const limited = limitExpensesPayload(resp.items as any, { summaryOnly, fields, hardTokenLimit: 24000 });
        return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(limited.items, null, 2) }] } as any;
      } else {
        const exp = await brex.getCardExpense(params.id, { expand: ['merchant','budget','location','department','receipts.download_uris'], load_custom_fields: true });
        const limited = limitExpensesPayload([exp] as any, { summaryOnly, fields, hardTokenLimit: 24000 });
        return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(limited.items[0] || {}, null, 2) }] } as any;
      }
    }

    // Fallback: instruct client to use tools for other URIs
    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify({ error: "Unsupported resource URI in router", guidance: "Use tools or supported resources: brex://expenses, brex://expenses/card, brex://docs/usage" }, null, 2)
      }]
    } as any;
  });
}


