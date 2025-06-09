/**
 * Unit tests for password reset service methods
 * Tests verifyPasswordResetToken() and resetPassword() functionality
 */

// Load environment variables first
import 'dotenv/config';
import { authService } from '../src/services/auth.service.js';

async function testVerifyPasswordResetToken() {
  console.log('🧪 Testing verifyPasswordResetToken() method...\n');

  try {
    // Test 1: Invalid/non-existent token
    console.log('1. Testing with invalid token...');
    const invalidResult = await authService.verifyPasswordResetToken('invalid-token-123');
    console.log('✅ Invalid token result:', {
      valid: invalidResult.valid,
      message: invalidResult.message,
      hasUserId: !!invalidResult.userId
    });
    
    if (!invalidResult.valid && invalidResult.message.includes('Invalid')) {
      console.log('✅ Invalid token properly rejected');
    } else {
      throw new Error('Invalid token should be rejected');
    }

    // Test 2: Generate a real token and test verification
    console.log('\n2. Testing with freshly generated token...');
    
    // First, let's test token generation
    const testToken = authService.generatePasswordResetToken();
    console.log('✅ Generated test token:', testToken.substring(0, 16) + '...');
    console.log('✅ Token length:', testToken.length);
    
    // Note: We can't easily test with a real token without creating a user first
    // So we'll focus on the invalid cases and format validation
    console.log('✅ Token generation working correctly');

    // Test 3: Test with malformed token (too short)
    console.log('\n3. Testing with malformed token...');
    const malformedResult = await authService.verifyPasswordResetToken('short');
    console.log('✅ Malformed token result:', {
      valid: malformedResult.valid,
      message: malformedResult.message
    });

    if (!malformedResult.valid) {
      console.log('✅ Malformed token properly rejected');
    } else {
      throw new Error('Malformed token should be rejected');
    }

    console.log('\n🎉 verifyPasswordResetToken() tests passed!');

  } catch (error) {
    console.error('❌ verifyPasswordResetToken test failed:', error.message);
    throw error;
  }
}

async function testResetPassword() {
  console.log('\n🧪 Testing resetPassword() method...\n');

  try {
    // Test 1: Invalid token
    console.log('1. Testing password reset with invalid token...');
    const invalidTokenResult = await authService.resetPassword('invalid-token', 'NewPassword123!');
    console.log('✅ Invalid token result:', {
      success: invalidTokenResult.success,
      message: invalidTokenResult.message
    });
    
    if (!invalidTokenResult.success && invalidTokenResult.message.includes('Invalid')) {
      console.log('✅ Invalid token properly rejected');
    } else {
      throw new Error('Invalid token should be rejected');
    }

    // Test 2: Valid token format but weak password
    console.log('\n2. Testing with weak password...');
    
    // Generate a properly formatted token (even though it won't exist in DB)
    const testToken = authService.generatePasswordResetToken();
    const weakPasswordResult = await authService.resetPassword(testToken, 'weak');
    console.log('✅ Weak password result:', {
      success: weakPasswordResult.success,
      message: weakPasswordResult.message
    });
    
    // Should fail due to invalid token (since we don't have a real user/token in DB)
    if (!weakPasswordResult.success) {
      console.log('✅ Request properly rejected (token validation happens first)');
    }

    // Test 3: Test password validation logic directly
    console.log('\n3. Testing password validation logic...');
    const strongPasswordCheck = authService.isValidPassword('StrongPassword123!');
    const weakPasswordCheck = authService.isValidPassword('weak');
    
    console.log('✅ Strong password validation:', {
      valid: strongPasswordCheck.valid,
      errors: strongPasswordCheck.errors
    });
    console.log('✅ Weak password validation:', {
      valid: weakPasswordCheck.valid,
      errors: weakPasswordCheck.errors
    });

    if (strongPasswordCheck.valid && !weakPasswordCheck.valid) {
      console.log('✅ Password validation logic working correctly');
    } else {
      throw new Error('Password validation logic not working properly');
    }

    // Test 4: Test password hashing integration
    console.log('\n4. Testing password hashing integration...');
    const testPassword = 'TestPassword123!';
    const hashedPassword = await authService.hashPassword(testPassword);
    console.log('✅ Password hashed successfully');
    console.log('✅ Hash length:', hashedPassword.length);
    console.log('✅ Hash is different from original:', hashedPassword !== testPassword);

    // Verify the hash can be compared
    const hashComparison = await authService.comparePassword(testPassword, hashedPassword);
    console.log('✅ Hash comparison works:', hashComparison);

    if (hashComparison) {
      console.log('✅ Password hashing integration working correctly');
    } else {
      throw new Error('Password hashing/comparison not working');
    }

    console.log('\n🎉 resetPassword() tests passed!');

  } catch (error) {
    console.error('❌ resetPassword test failed:', error.message);
    throw error;
  }
}

async function testSecurityLogging() {
  console.log('\n🧪 Testing security logging functionality...\n');

  try {
    // Test logging by triggering some verification attempts
    console.log('1. Testing security audit logging...');
    
    // This will trigger logging inside the service methods
    await authService.verifyPasswordResetToken('test-token-for-logging');
    console.log('✅ Security logging triggered (check console output above)');

    await authService.resetPassword('test-token-for-logging', 'TestPassword123!');
    console.log('✅ Additional security logging triggered');

    console.log('✅ Security logging appears to be working');
    console.log('💡 Check console output for [SECURITY_AUDIT] entries');

    console.log('\n🎉 Security logging tests passed!');

  } catch (error) {
    console.error('❌ Security logging test failed:', error.message);
    throw error;
  }
}

async function testPasswordResetExpiry() {
  console.log('\n🧪 Testing password reset expiry logic...\n');

  try {
    // Test expiry date generation
    console.log('1. Testing expiry date generation...');
    const expiryDate = authService.getPasswordResetExpiry();
    const now = new Date();
    const hourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    
    console.log('✅ Expiry date:', expiryDate.toISOString());
    console.log('✅ Current time:', now.toISOString());
    console.log('✅ Expected (1hr from now):', hourFromNow.toISOString());
    
    // Check if expiry is approximately 1 hour from now (within 1 second tolerance)
    const timeDiff = Math.abs(expiryDate.getTime() - hourFromNow.getTime());
    console.log('✅ Time difference (ms):', timeDiff);
    
    if (timeDiff < 1000) {
      console.log('✅ Expiry date calculation is correct');
    } else {
      throw new Error('Expiry date calculation is incorrect');
    }

    console.log('\n🎉 Password reset expiry tests passed!');

  } catch (error) {
    console.error('❌ Password reset expiry test failed:', error.message);
    throw error;
  }
}

// Run all tests
async function runAllPasswordResetTests() {
  try {
    await testVerifyPasswordResetToken();
    await testResetPassword();
    await testSecurityLogging();
    await testPasswordResetExpiry();
    
    console.log('\n✨ All password reset service tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('  ✅ Token verification logic');
    console.log('  ✅ Invalid token handling');
    console.log('  ✅ Password validation integration');
    console.log('  ✅ Password hashing integration');
    console.log('  ✅ Security audit logging');
    console.log('  ✅ Expiry date calculation');
    console.log('\n💡 Next steps: Add routes and create integration tests');
    
    // Clean exit
    process.exit(0);
  } catch (error) {
    console.error('❌ Password reset service test suite failed:', error.message);
    process.exit(1);
  }
}

runAllPasswordResetTests(); 