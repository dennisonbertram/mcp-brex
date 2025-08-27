#!/bin/bash

# Brex MCP Server Manual Testing Script
# This script tests the MCP server by sending JSON-RPC messages via stdio

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

# Check if build directory exists
if [ ! -d "build" ]; then
    error "Build directory not found. Run 'npm run build' first."
    exit 1
fi

# Create temporary files for communication
REQUEST_FILE=$(mktemp)
RESPONSE_FILE=$(mktemp)
ERROR_FILE=$(mktemp)

# Cleanup function
cleanup() {
    rm -f "$REQUEST_FILE" "$RESPONSE_FILE" "$ERROR_FILE"
}
trap cleanup EXIT

log "Starting Brex MCP Server Manual Testing"
log "========================================="

# Test 1: Initialize the server
log "Test 1: Server Initialization"
echo '{
  "jsonrpc": "2.0", 
  "id": 1, 
  "method": "initialize", 
  "params": {
    "protocolVersion": "2024-11-05", 
    "capabilities": {}, 
    "clientInfo": {"name": "manual-test", "version": "1.0.0"}
  }
}' > "$REQUEST_FILE"

log "Sending initialization request..."
node build/index.js < "$REQUEST_FILE" > "$RESPONSE_FILE" 2> "$ERROR_FILE" &
SERVER_PID=$!
sleep 5
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true

if [ -s "$RESPONSE_FILE" ]; then
    success "Server initialization successful"
    log "Response:"
    cat "$RESPONSE_FILE" | jq '.' 2>/dev/null || cat "$RESPONSE_FILE"
else
    warning "Empty response from server initialization"
fi

echo ""

# Test 2: List available tools
log "Test 2: List Available Tools"
echo '{
  "jsonrpc": "2.0", 
  "id": 2, 
  "method": "tools/list"
}' > "$REQUEST_FILE"

log "Requesting tool list..."
node build/index.js < "$REQUEST_FILE" > "$RESPONSE_FILE" 2> "$ERROR_FILE" &
SERVER_PID=$!
sleep 5
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true

if [ -s "$RESPONSE_FILE" ]; then
    success "Tools list retrieved successfully"
    log "Response:"
    cat "$RESPONSE_FILE" | jq '.result.tools | length' 2>/dev/null && echo " tools found" || echo "Could not parse tool count"
    
    # Show first few tools for verification
    log "Sample tools:"
    cat "$RESPONSE_FILE" | jq '.result.tools[0:3] | .[] | {name: .name, description: .description}' 2>/dev/null || {
        log "Raw response (first 500 chars):"
        head -c 500 "$RESPONSE_FILE"
    }
else
    warning "Empty response from tools list request"
fi

echo ""

# Test 3: Call a simple read-only tool (get_budgets)
log "Test 3: Test Tool Call - get_budgets"
echo '{
  "jsonrpc": "2.0", 
  "id": 3, 
  "method": "tools/call",
  "params": {
    "name": "get_budgets",
    "arguments": {
      "limit": 5,
      "summary_only": true
    }
  }
}' > "$REQUEST_FILE"

log "Calling get_budgets tool..."
node build/index.js < "$REQUEST_FILE" > "$RESPONSE_FILE" 2> "$ERROR_FILE" &
SERVER_PID=$!
sleep 8
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true

if [ -s "$RESPONSE_FILE" ]; then
    success "get_budgets tool call completed"
    log "Response (first 1000 chars):"
    head -c 1000 "$RESPONSE_FILE"
    echo ""
    
    # Check if it's an error response
    if cat "$RESPONSE_FILE" | grep -q '"error"'; then
        warning "Tool call returned an error (expected if no API key is set)"
        cat "$RESPONSE_FILE" | jq '.error' 2>/dev/null || echo "Could not parse error"
    fi
else
    warning "Empty response from get_budgets tool call"
fi

echo ""

# Test 4: Test another tool with different parameters
log "Test 4: Test Tool Call - get_expenses"
echo '{
  "jsonrpc": "2.0", 
  "id": 4, 
  "method": "tools/call",
  "params": {
    "name": "get_expenses",
    "arguments": {
      "limit": 3,
      "summary_only": true,
      "fields": ["id", "status", "purchased_amount.amount"]
    }
  }
}' > "$REQUEST_FILE"

log "Calling get_expenses tool..."
node build/index.js < "$REQUEST_FILE" > "$RESPONSE_FILE" 2> "$ERROR_FILE" &
SERVER_PID=$!
sleep 8
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true

if [ -s "$RESPONSE_FILE" ]; then
    success "get_expenses tool call completed"
    log "Response (first 1000 chars):"
    head -c 1000 "$RESPONSE_FILE"
    echo ""
    
    # Check if it's an error response
    if cat "$RESPONSE_FILE" | grep -q '"error"'; then
        warning "Tool call returned an error (expected if no API key is set)"
        cat "$RESPONSE_FILE" | jq '.error' 2>/dev/null || echo "Could not parse error"
    fi
else
    warning "Empty response from get_expenses tool call"
fi

echo ""

log "MCP Server Testing Complete"
log "=============================="

# Summary
success "Summary:"
echo "- Server initialization: Tested"
echo "- Tools listing: Tested" 
echo "- Tool calls (get_budgets): Tested"
echo "- Tool calls (get_expenses): Tested"
echo ""
warning "Note: Tool calls may show errors if BREX_API_KEY environment variable is not set"
warning "This is expected behavior for the MCP server when credentials are missing"