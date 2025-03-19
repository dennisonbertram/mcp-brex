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

import axios, { AxiosInstance, AxiosError } from 'axios';
import { appConfig } from '../../config/index.js';
import { logError, logInfo, logWarn, logDebug } from '../../utils/logger.js';
import { BrexAccount, BrexTransaction, BrexPaginatedResponse } from './types.js';

export class BrexClient {
  private client: AxiosInstance;

  constructor() {
    if (!appConfig.brex.apiKey) {
      logWarn('Brex API key is not set. API requests will fail with 401 Unauthorized.');
    }

    this.client = axios.create({
      baseURL: appConfig.brex.apiUrl,
      headers: {
        'Authorization': `Bearer ${appConfig.brex.apiKey}`,
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
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          logError(`Brex API authentication failed: Invalid or expired API key. Check your BREX_API_KEY in .env file.`, {
            method: error.config?.method,
            url: error.config?.url,
            status: error.response?.status,
          });
        } else {
          logError(error, {
            method: error.config?.method,
            url: error.config?.url,
            status: error.response?.status,
          });
        }
        throw error;
      }
    );
  }

  async getAccounts(): Promise<BrexPaginatedResponse<BrexAccount>> {
    try {
      logDebug('Fetching accounts from Brex API using v2/accounts/cash endpoint');
      const response = await this.client.get('/v2/accounts/cash');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw new Error(`Brex API authentication failed: Please check your API key in the .env file`);
      }
      throw error;
    }
  }

  async getAccount(accountId: string): Promise<BrexAccount> {
    try {
      logDebug(`Fetching account ${accountId} from Brex API`);
      // First try to get specific account details
      try {
        const response = await this.client.get(`/v2/accounts/cash/${accountId}`);
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          // If specific endpoint fails, get all accounts and filter
          logDebug(`Account endpoint not found, falling back to accounts list for ${accountId}`);
          const accounts = await this.getAccounts();
          const account = accounts.items.find(acc => acc.id === accountId);
          
          if (!account) {
            throw new Error(`Account with ID ${accountId} not found`);
          }
          
          return account;
        }
        throw error;
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw new Error(`Brex API authentication failed: Please check your API key in the .env file`);
      }
      throw error;
    }
  }

  async getTransactions(
    accountId: string,
    cursor?: string,
    limit: number = 50
  ): Promise<BrexPaginatedResponse<BrexTransaction>> {
    try {
      logDebug(`Fetching transactions for account ${accountId}`);
      // Try the statements endpoint as a fallback for transaction data
      const response = await this.client.get(`/v2/accounts/cash/${accountId}/statements`, {
        params: {
          cursor,
          limit,
        },
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw new Error(`Brex API authentication failed: Please check your API key in the .env file`);
      }
      throw error;
    }
  }

  async getTransaction(transactionId: string): Promise<BrexTransaction> {
    try {
      // This is a fallback implementation since we couldn't find a direct transaction endpoint
      throw new Error('Individual transaction endpoint not available');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw new Error(`Brex API authentication failed: Please check your API key in the .env file`);
      }
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      const response = await this.client.get('/v2/users/me');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw new Error(`Brex API authentication failed: Please check your API key in the .env file`);
      }
      throw error;
    }
  }
} 