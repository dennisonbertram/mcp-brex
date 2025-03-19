/**
 * @file Brex API Client
 * @version 1.0.0
 * @status STABLE - DO NOT MODIFY WITHOUT TESTS
 * @lastModified 2024-02-14
 * 
 * Brex API client implementation
 * 
 * IMPORTANT:
 * - Add tests for any new API endpoints
 * - Handle rate limiting and errors appropriately
 * 
 * Functionality:
 * - Fetch accounts and transactions
 * - Handle authentication and errors
 * - Implement rate limiting
 */

import axios, { AxiosInstance } from 'axios';
import { config } from '../../config/index.js';
import { logError, logInfo } from '../../utils/logger.js';
import { BrexAccount, BrexTransaction, BrexPaginatedResponse } from './types.js';

export class BrexClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.brex.apiUrl,
      headers: {
        'Authorization': `Bearer ${config.brex.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logInfo('Brex API request successful', {
          method: response.config.method,
          url: response.config.url,
          status: response.status,
        });
        return response;
      },
      (error) => {
        logError(error, {
          method: error.config?.method,
          url: error.config?.url,
          status: error.response?.status,
        });
        throw error;
      }
    );
  }

  async getAccounts(): Promise<BrexPaginatedResponse<BrexAccount>> {
    const response = await this.client.get('/v2/accounts');
    return response.data;
  }

  async getAccount(accountId: string): Promise<BrexAccount> {
    const response = await this.client.get(`/v2/accounts/${accountId}`);
    return response.data;
  }

  async getTransactions(
    accountId: string,
    cursor?: string,
    limit: number = 50
  ): Promise<BrexPaginatedResponse<BrexTransaction>> {
    const response = await this.client.get('/v2/transactions', {
      params: {
        account_id: accountId,
        cursor,
        limit,
      },
    });
    return response.data;
  }

  async getTransaction(transactionId: string): Promise<BrexTransaction> {
    const response = await this.client.get(`/v2/transactions/${transactionId}`);
    return response.data;
  }
} 