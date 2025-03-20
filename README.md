# Brex MCP Server

A Model Context Protocol (MCP) server for integrating with the Brex API, enabling AI agents to interact with financial data and resources.

## Overview

This MCP server provides a bridge between AI agents and the Brex financial platform, allowing agents to:

- Retrieve account information and transactions
- Access expense data and receipts
- Manage budget resources and spend limits
- View team information

The server implements standardized resource handlers and tools following the MCP specification, enabling secure and efficient access to financial data.

## Features

### Resources

#### Account Resources
- `brex://accounts` - List all accounts
- `brex://accounts/{id}` - Access specific account details

#### Expense Resources
- `brex://expenses` - List all expenses with pagination
- `brex://expenses/{id}` - Access specific expense details
- `brex://expenses/card` - List all card expenses
- `brex://expenses/card/{id}` - Access specific card expense details

#### Budget Resources
- `brex://budgets` - List all budgets with pagination
- `brex://budgets/{id}` - Access specific budget details
- `brex://spend_limits` - List all spend limits
- `brex://spend_limits/{id}` - Access specific spend limit details
- `brex://budget_programs` - List all budget programs
- `brex://budget_programs/{id}` - Access specific budget program details

#### Team Resources
- `brex://users/me` - Get current user information

### Tools

#### Receipt Management
- `match_receipt` - Match a receipt with existing expenses
- `upload_receipt` - Upload a receipt for a specific expense

#### Expense Management
- `update_expense` - Update details for a card expense (memo, category, etc.)

> **Note**: For security reasons, tools that create, update, or delete budgets, spend limits, and budget programs are not implemented in this version.

## Installation

### Prerequisites
- Node.js v18 or higher
- Brex API access token

### Setup

1. Clone this repository:
```bash
git clone https://github.com/dennisonbertram/brex-mcp-server.git
cd brex-mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with your Brex API token:
```
BREX_API_TOKEN=your_token_here
```

4. Build the server:
```bash
npm run build
```

### Configuration with Claude

To use with Claude Desktop, you need to add the server to Claude's configuration file:

On macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
On Windows: `%APPDATA%\Claude\claude_desktop_config.json`

1. Open Claude for Desktop and go to settings by clicking on the Claude menu and selecting "Settings..."
2. Click on "Developer" in the left sidebar, then click "Edit Config"
3. Update the configuration file with the Brex MCP server settings, including your API key:

```json
{
  "mcpServers": {
    "brex-server": {
      "command": "node",
      "args": [
        "/path/to/brex-mcp-server/build/index.js",
        "--brex-api-token=your_brex_api_token_here"
      ]
    }
  }
}
```

Make sure to:
- Replace `/path/to/brex-mcp-server` with the actual path where you installed the server
- Replace `your_brex_api_token_here` with your actual Brex API token
- Use absolute paths for the server location

4. Save the file and restart Claude for Desktop
5. Verify the server is working by checking for the hammer icon in the bottom right corner of the input box

> **Note**: Passing the API token via configuration is more convenient when using Claude Desktop, but you can also continue to use the `.env` file method described above.

## Development

For development with auto-rebuild:
```bash
npm run dev
```

Lint your code:
```bash
npm run lint
```

Run tests:
```bash
npm run test
```

### Debugging

Since MCP servers communicate over stdio, debugging can be challenging. We recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) for debugging.

## Security Considerations

This server implements several security measures:
- Read-only operations for sensitive financial resources
- No storage of API credentials in code
- Rate limiting for API requests
- Proper error handling and logging

## Implementation Status

For a detailed implementation plan and status of various features, see `documentation/implementation_plan.md`.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Author

Dennison Bertram - [dennison@dennisonbertram.com](mailto:dennison@dennisonbertram.com)
