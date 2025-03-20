/**
 * @file Common Models
 * @description Common TypeScript interfaces used across multiple Brex API resources
 */

/**
 * Money represents a monetary value with amount and currency
 */
export interface Money {
  amount: number;
  currency: string;
}

/**
 * Pagination parameters for list endpoints
 */
export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

/**
 * Standard response format for paginated list endpoints
 */
export interface PaginatedResponse<T> {
  items: T[];
  next_cursor?: string;
  has_more: boolean;
}

/**
 * Query parameters parser
 * Extracts query parameters from a URI string
 * 
 * @param uri - URI with query parameters
 * @returns Object with extracted query parameters
 */
export function parseQueryParams(uri: string): Record<string, string> {
  const params: Record<string, string> = {};
  try {
    const url = new URL(uri);
    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });
  } catch (error) {
    // If URI can't be parsed as URL, return empty params
    console.error(`Error parsing URI query params: ${error}`);
  }
  return params;
}

/**
 * Type guard to check if an object is a valid Money object
 */
export function isMoney(obj: any): obj is Money {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.amount === 'number' &&
    typeof obj.currency === 'string'
  );
} 