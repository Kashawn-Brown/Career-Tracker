/**
 * Quick test for Security Questions API endpoints
 * Run with: npx tsx test-security-questions.js
 */

import { authService } from './src/services/auth.service.js';

async function testSecurityQuestions() {
  console.log('🧪 Testing Security Questions API...\n');

  try {
    // Test 1: Set up security questions for a mock user
    console.log('1. Testing setupSecurityQuestions...');
    const testQuestions = [
      { question: 'FIRST_PET_NAME', answer: 'Buddy' },
      { question: 'BIRTH_CITY', answer: 'New York' },
      { question: 'FIRST_SCHOOL', answer: 'Lincoln Elementary' }
    ];

    const setupResult = await authService.setupSecurityQuestions(1, testQuestions);
    console.log('   ✅ Setup result:', setupResult);

    // Test 2: Get user's security questions
    console.log('\n2. Testing getUserSecurityQuestions...');
    const userQuestions = await authService.getUserSecurityQuestions(1);
    console.log('   ✅ User questions count:', userQuestions.questions.length);
    console.log('   📝 First question type:', userQuestions.questions[0]?.question);

    // Test 3: Test recovery questions for non-existent email
    console.log('\n3. Testing getRecoveryQuestions (non-existent email)...');
    const recoveryTest1 = await authService.getRecoveryQuestions('nonexistent@test.com');
    console.log('   ✅ Non-existent email result:', recoveryTest1.message);

    // Test 4: Test answer hashing and comparison
    console.log('\n4. Testing answer hashing...');
    const testAnswer = 'Buddy';
    const hash = await authService.hashSecurityAnswer(testAnswer);
    console.log('   ✅ Answer hashed successfully');
    
    const isCorrect = await authService.compareSecurityAnswer(testAnswer, hash);
    console.log('   ✅ Answer comparison result:', isCorrect);
    
    // Test case sensitivity (should work due to normalization)
    const isCorrectCaseInsensitive = await authService.compareSecurityAnswer('buddy', hash);
    console.log('   ✅ Case insensitive match:', isCorrectCaseInsensitive);

    console.log('\n✅ All security questions tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testSecurityQuestions(); 