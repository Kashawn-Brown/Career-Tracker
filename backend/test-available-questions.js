/**
 * Test the available security questions endpoint
 * Run with: npx tsx test-available-questions.js
 */

import { authService } from './src/services/auth.service.js';

async function testAvailableQuestions() {
  console.log('🧪 Testing Available Security Questions Endpoint...\n');

  try {
    const result = await authService.getAvailableSecurityQuestions();
    
    console.log('✅ Available Security Questions:');
    console.log('='.repeat(50));
    
    result.questions.forEach((question, index) => {
      console.log(`${index + 1}. ${question.type}`);
      console.log(`   "${question.text}"`);
      console.log('');
    });
    
    console.log(`✅ Total: ${result.questions.length} questions available`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAvailableQuestions(); 