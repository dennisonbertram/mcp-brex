import { BrexClient } from '../build/services/brex/client.js';
import { logDebug, logInfo, logError } from '../build/utils/logger.js';

async function main() {
  console.log('Starting direct Brex API test...');

  try {
    // Create Brex client
    const brexClient = new BrexClient();
    
    // Test card expenses endpoint
    console.log('\n=== Testing Card Expenses API ===');
    try {
      const cardExpenses = await brexClient.getCardExpenses({ limit: 10 });
      console.log('Raw Response Structure:');
      
      // Check the response structure
      console.log('Response Keys:', Object.keys(cardExpenses));
      
      if (cardExpenses.items && Array.isArray(cardExpenses.items)) {
        console.log(`Found ${cardExpenses.items.length} card expenses`);
        
        if (cardExpenses.items.length > 0) {
          const firstItem = cardExpenses.items[0];
          console.log('First Item Keys:', Object.keys(firstItem));
          console.log('First Item:', JSON.stringify(firstItem, null, 2));
          
          // Check if items have id and updated_at
          const itemsWithId = cardExpenses.items.filter(item => item.id);
          const itemsWithUpdatedAt = cardExpenses.items.filter(item => item.updated_at);
          
          console.log(`Items with ID: ${itemsWithId.length}/${cardExpenses.items.length}`);
          console.log(`Items with updated_at: ${itemsWithUpdatedAt.length}/${cardExpenses.items.length}`);
        }
      } else {
        console.log('No items array found in response');
        console.log('Full Response:', JSON.stringify(cardExpenses, null, 2));
      }
    } catch (error) {
      console.error('Error fetching card expenses:', error);
    }
    
    // Test specific card expense
    console.log('\n=== Testing Specific Card Expense API ===');
    try {
      // Use the firstItemId from previous call if available, or a hardcoded ID
      const specificId = 'expense_cm7s41srj3iat0g56i7yfyz00'; // Replace with actual ID if needed
      
      const cardExpense = await brexClient.getCardExpense(specificId);
      console.log('Response Structure:');
      console.log('Response Keys:', Object.keys(cardExpense));
      console.log('Response:', JSON.stringify(cardExpense, null, 2));
      
      // Check for id and updated_at
      console.log(`Has ID: ${Boolean(cardExpense.id)}`);
      console.log(`Has updated_at: ${Boolean(cardExpense.updated_at)}`);
    } catch (error) {
      console.error('Error fetching specific card expense:', error);
    }
    
  } catch (error) {
    console.error('Error in test:', error);
  }
  
  console.log('\n=== Test Completed ===');
}

main().catch(console.error); 