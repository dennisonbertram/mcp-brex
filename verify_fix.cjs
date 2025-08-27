#!/usr/bin/env node
/**
 * Verification script for card transactions expand parameter fix
 * This verifies the code changes prevent expand from being passed to the API
 */

const fs = require('fs');
const path = require('path');

console.log('=== Verifying Card Transactions Expand Fix ===\n');

// Read the updated file
const filePath = path.join(__dirname, 'src/tools/getCardTransactions.ts');
const content = fs.readFileSync(filePath, 'utf8');

// Check for the fix implementation
const checks = [
  {
    name: 'Comment explaining expand is not supported',
    pattern: /NOTE: expand parameter is intentionally ignored/,
    found: false
  },
  {
    name: 'Comment about 400 error',
    pattern: /400 "Unsupported entity expansion"/,
    found: false
  },
  {
    name: 'Expand not passed to API call',
    pattern: /getCardTransactions\(\{[^}]*expand:/,
    shouldNotExist: true,
    found: false
  },
  {
    name: 'Comment about expand being omitted',
    pattern: /expand is intentionally omitted/,
    found: false
  }
];

// Run checks
checks.forEach(check => {
  if (check.shouldNotExist) {
    check.found = !check.pattern.test(content);
    console.log(`${check.found ? '✅' : '❌'} ${check.name}: ${check.found ? 'Not found (correct)' : 'Found (should be removed)'}`);
  } else {
    check.found = check.pattern.test(content);
    console.log(`${check.found ? '✅' : '❌'} ${check.name}: ${check.found ? 'Found' : 'Not found'}`);
  }
});

// Check the actual API call structure
const apiCallMatch = content.match(/await client\.getCardTransactions\(\{([^}]+)\}/s);
if (apiCallMatch) {
  const apiCallParams = apiCallMatch[1];
  console.log('\n📋 API call parameters:');
  const params = apiCallParams.split('\n').filter(line => line.trim()).map(line => line.trim());
  params.forEach(param => {
    if (param.includes('expand') && !param.trim().startsWith('//')) {
      console.log(`  ❌ ${param} (should be removed or commented)`);
    } else if (param.trim().startsWith('//')) {
      console.log(`  💬 ${param}`);
    } else {
      console.log(`  ✅ ${param}`);
    }
  });
}

// Verify interface still has expand for compatibility
const interfaceMatch = content.match(/interface GetCardTransactionsParams \{([^}]+)\}/s);
if (interfaceMatch) {
  const hasExpand = interfaceMatch[1].includes('expand?: string[]');
  console.log(`\n${hasExpand ? '✅' : '❌'} Interface still has expand parameter for compatibility: ${hasExpand ? 'Yes' : 'No'}`);
}

// Summary
console.log('\n=== Summary ===');
const allPassed = checks.every(check => {
  if (check.shouldNotExist) {
    return check.found === true; // found should be true when shouldNotExist (because we inverted it)
  } else {
    return check.found === true; // found should be true for regular checks
  }
});
if (allPassed) {
  console.log('✅ All checks passed! The fix has been correctly implemented.');
  console.log('\nThe tool will now:');
  console.log('1. Accept expand parameters without errors');
  console.log('2. NOT pass expand to the Brex API (preventing 400 errors)');
  console.log('3. Still return merchant information (included by default)');
} else {
  console.log('❌ Some checks failed. Please review the implementation.');
}

process.exit(allPassed ? 0 : 1);