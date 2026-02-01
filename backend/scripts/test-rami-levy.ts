#!/usr/bin/env ts-node
/**
 * Rami Levy Service Local Test Script
 * 
 * Run with: cd backend && npx ts-node scripts/test-rami-levy.ts
 * 
 * Or for quick test: npm run test:rami-levy
 */

import 'dotenv/config';
import { ramiLevyService } from '../src/services/cooking/ramiLevyService';

const TEST_USER_ID = process.env.TEST_USER_ID || 'b9887fdc-7382-4b82-8fed-52e45e6a5b3b';

async function runTests() {
  console.log('\n🧪 Rami Levy Service - Local Test Suite\n');
  console.log('='.repeat(50));

  try {
    // Test 1: Initialize
    console.log('\n📋 Test 1: Initialize Service');
    console.log('-'.repeat(40));
    
    const status = await ramiLevyService.initialize(TEST_USER_ID);
    
    if (status.isValid) {
      console.log('✅ Status: Valid');
      console.log(`   Token expires: ${status.expiresIn}`);
      console.log(`   Expiring soon: ${status.isExpiringSoon ? 'Yes ⚠️' : 'No'}`);
    } else {
      console.log('❌ Status: Invalid');
      console.log(`   Error: ${status.errorMessage}`);
      if (status.refreshInstructions) {
        console.log('\n📝 Instructions:\n', status.refreshInstructions);
      }
      process.exit(1);
    }

    // Test 2: Product Search
    console.log('\n📋 Test 2: Product Search');
    console.log('-'.repeat(40));
    
    const searchQuery = 'חלב';
    console.log(`   Searching for: "${searchQuery}"`);
    
    const searchResult = await ramiLevyService.searchProducts(TEST_USER_ID, searchQuery, { limit: 5 });
    
    console.log(`✅ Found ${searchResult.total} products (showing ${searchResult.products.length})`);
    searchResult.products.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.name} - ₪${p.price}`);
    });

    // Test 3: Cart Operations
    console.log('\n📋 Test 3: Cart Operations');
    console.log('-'.repeat(40));
    
    // Get first product for testing
    const testProduct = searchResult.products[0];
    console.log(`   Adding to cart: ${testProduct.name}`);
    
    const cart = await ramiLevyService.addToCart(TEST_USER_ID, [
      { productId: testProduct.id, quantity: 1 }
    ]);
    
    console.log(`✅ Cart updated:`);
    console.log(`   Items: ${cart.itemCount}`);
    console.log(`   Total: ₪${cart.totalPrice}`);
    cart.items.slice(0, 3).forEach(item => {
      if (!item.name.includes('משלוח')) {
        console.log(`   - ${item.name}: ${item.quantity} x ₪${item.price}`);
      }
    });

    // Test 4: Circuit Breaker Status
    console.log('\n📋 Test 4: Circuit Breaker Status');
    console.log('-'.repeat(40));
    
    const cbStatus = ramiLevyService.getCircuitBreakerStatus();
    console.log(`   Open: ${cbStatus.isOpen ? 'Yes ⚠️' : 'No ✅'}`);
    console.log(`   Failures: ${cbStatus.failures}/${cbStatus.threshold}`);

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('🎉 All tests passed!\n');
    console.log(`📌 Checkout URL: ${ramiLevyService.getCheckoutUrl()}`);

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }

  process.exit(0);
}

runTests();
