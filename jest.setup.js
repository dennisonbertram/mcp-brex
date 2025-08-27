// Set up test environment variables
process.env.BREX_API_KEY = 'test-api-key';
process.env.BREX_API_URL = 'https://api.brex.com/test';
process.env.PORT = '3000';
process.env.RATE_LIMIT_REQUESTS = '100';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.LOG_LEVEL = 'error'; // Reduce noise in tests