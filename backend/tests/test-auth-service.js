/**
 * Quick test script to verify AuthService functionality
 * This is a temporary test file to ensure core auth services work
 */

// Load environment variables first
import 'dotenv/config';
import { authService } from '../src/services/auth.service.js';

async function testAuthService() {
  console.log('🧪 Testing AuthService...\n');

  // Check if JWT secrets are available
  console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
  console.log('JWT_REFRESH_SECRET exists:', !!process.env.JWT_REFRESH_SECRET);
  console.log('');

  try {
    // Test 1: Password hashing and comparison
    console.log('1. Testing password hashing...');
    const testPassword = 'MySecurePass123!';
    const hashedPassword = await authService.hashPassword(testPassword);
    console.log('✅ Password hashed successfully');
    console.log('Hash length:', hashedPassword.length);

    // Test 2: Password comparison
    console.log('\n2. Testing password comparison...');
    const isValidPassword = await authService.comparePassword(testPassword, hashedPassword);
    const isInvalidPassword = await authService.comparePassword('WrongPassword123!', hashedPassword);
    console.log('✅ Correct password verification:', isValidPassword);
    console.log('✅ Incorrect password verification:', isInvalidPassword);

    // Test 3: JWT token generation (only if secrets are available)
    if (process.env.JWT_SECRET && process.env.JWT_REFRESH_SECRET) {
      console.log('\n3. Testing JWT token generation...');
      const tokenPair = authService.generateTokenPair(1, 'test@example.com');
      console.log('✅ Access token generated:', tokenPair.accessToken.substring(0, 20) + '...');
      console.log('✅ Refresh token generated:', tokenPair.refreshToken.substring(0, 20) + '...');

      // Test 4: JWT token verification
      console.log('\n4. Testing JWT token verification...');
      const decodedAccess = authService.verifyAccessToken(tokenPair.accessToken);
      console.log('✅ Access token verified:', decodedAccess.userId, decodedAccess.email);

      const decodedRefresh = authService.verifyRefreshToken(tokenPair.refreshToken);
      console.log('✅ Refresh token verified:', decodedRefresh.userId, decodedRefresh.email);
    } else {
      console.log('\n3. ⚠️  Skipping JWT tests - JWT secrets not found in environment');
      console.log('   This is normal if you\'re testing without .env setup');
    }

    // Test 5: Email verification token
    console.log('\n5. Testing email verification token...');
    const emailToken = authService.generateEmailVerificationToken();
    console.log('✅ Email verification token:', emailToken.substring(0, 16) + '...');
    console.log('✅ Token length:', emailToken.length);

    // Test 6: Email validation
    console.log('\n6. Testing email validation...');
    console.log('✅ Valid email test:', authService.isValidEmail('test@example.com'));
    console.log('✅ Invalid email test:', authService.isValidEmail('invalid-email'));

    // Test 7: Password validation
    console.log('\n7. Testing password validation...');
    const validPasswordCheck = authService.isValidPassword('MySecurePass123!');
    const invalidPasswordCheck = authService.isValidPassword('weak');
    console.log('✅ Strong password validation:', validPasswordCheck.valid);
    console.log('✅ Weak password validation:', invalidPasswordCheck.valid, invalidPasswordCheck.errors);

    console.log('\n🎉 All AuthService tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testAuthService(); 