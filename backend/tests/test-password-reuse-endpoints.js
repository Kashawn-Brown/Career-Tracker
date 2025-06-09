/**
 * HTTP integration tests for password reuse prevention
 * Tests that password reuse is prevented through the reset password API
 */

import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import config from '../dist/src/config/index.js';
import routes from '../dist/src/routes/index.js';
import { PassportConfig } from '../dist/src/config/passport.config.js';
import bcrypt from 'bcrypt';

async function buildTestApp() {
  const app = Fastify({ logger: false });
  
  // Register plugins
  await app.register(cors, config.cors);
  await app.register(sensible);
  
  // Initialize Passport OAuth strategies
  PassportConfig.initialize();
  
  // Register all routes
  await app.register(routes);
  
  return app;
}

async function testPasswordReuseViaHTTP() {
  console.log('🚀 Starting Password Reuse Prevention HTTP Integration Test...\n');

  const app = await buildTestApp();
  const { PrismaClient } = await import('@prisma/client');
  const { authService } = await import('../dist/src/services/auth.service.js');
  const prisma = new PrismaClient();
  
  let testUserId = null;

  try {
    // Set up test user with initial password history
    console.log('1. Setting up test user with password history...');
    
    const testUser = await prisma.user.create({
      data: {
        email: `test-password-reuse-http-${Date.now()}@example.com`,
        name: 'HTTP Password Reuse Test User',
        password: await bcrypt.hash('InitialPassword123!', 12)
      }
    });
    testUserId = testUser.id;
    console.log('✅ Test user created with ID:', testUserId);

    // Add some passwords to history
    const password1Hash = await authService.hashPassword('OldPassword123!');
    await authService.storePasswordInHistory(testUserId, password1Hash);
    
    const password2Hash = await authService.hashPassword('AnotherOldPassword123!');
    await authService.storePasswordInHistory(testUserId, password2Hash);
    
    console.log('✅ Added 2 passwords to user history');

    // Test 1: Create password reset token and try to reuse old password
    console.log('\n2. Testing password reuse prevention via HTTP API...');
    
    const resetToken = authService.generatePasswordResetToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: testUserId,
        token: resetToken,
        expiresAt: authService.getPasswordResetExpiry()
      }
    });

    // Try to reset password to one that's in history
    const resetResponse = await app.inject({
      method: 'POST',
      url: `/api/auth/reset-password/${resetToken}`,
      payload: {
        password: 'OldPassword123!' // This should be rejected (in history)
      }
    });

    console.log('✅ Reset with reused password status:', resetResponse.statusCode);
    console.log('✅ Reset with reused password response:', JSON.parse(resetResponse.payload));
    
    if (resetResponse.statusCode === 400) {
      const responseBody = JSON.parse(resetResponse.payload);
      const errorMessage = responseBody.message || responseBody.error || '';
      if (errorMessage.includes('cannot reuse a password')) {
        console.log('✅ HTTP API correctly prevents password reuse');
      } else {
        throw new Error(`HTTP API rejected password but not for reuse reason. Message: ${errorMessage}`);
      }
    } else {
      throw new Error(`Expected 400 for password reuse, got ${resetResponse.statusCode}`);
    }

    // Test 2: Use the same token with a new password (should work)
    console.log('\n3. Testing password reset with new password via HTTP...');
    
    // Create fresh token since the previous one was consumed
    const resetToken2 = authService.generatePasswordResetToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: testUserId,
        token: resetToken2,
        expiresAt: authService.getPasswordResetExpiry()
      }
    });

    const resetResponse2 = await app.inject({
      method: 'POST',
      url: `/api/auth/reset-password/${resetToken2}`,
      payload: {
        password: 'BrandNewPassword123!' // This should be accepted (not in history)
      }
    });

    console.log('✅ Reset with new password status:', resetResponse2.statusCode);
    console.log('✅ Reset with new password response:', JSON.parse(resetResponse2.payload));
    
    if (resetResponse2.statusCode === 200) {
      const responseBody = JSON.parse(resetResponse2.payload);
      if (responseBody.message.includes('reset successfully')) {
        console.log('✅ HTTP API allows new password (not in history)');
      } else {
        throw new Error('HTTP API succeeded but with unexpected message');
      }
    } else {
      throw new Error(`Expected 200 for new password, got ${resetResponse2.statusCode}`);
    }

    // Test 3: Verify the new password is now in history
    console.log('\n4. Verifying new password was added to history...');
    
    const isNewPasswordInHistory = await authService.isPasswordRecentlyUsed(testUserId, 'BrandNewPassword123!');
    if (isNewPasswordInHistory) {
      console.log('✅ New password was properly added to history');
    } else {
      throw new Error('New password was not added to history after successful reset');
    }

    // Test 4: Try to reuse the password we just set
    console.log('\n5. Testing immediate reuse of just-set password...');
    
    const resetToken3 = authService.generatePasswordResetToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: testUserId,
        token: resetToken3,
        expiresAt: authService.getPasswordResetExpiry()
      }
    });

    const resetResponse3 = await app.inject({
      method: 'POST',
      url: `/api/auth/reset-password/${resetToken3}`,
      payload: {
        password: 'BrandNewPassword123!' // This should now be rejected (just used)
      }
    });

    console.log('✅ Reset with just-used password status:', resetResponse3.statusCode);
    
    if (resetResponse3.statusCode === 400) {
      const responseBody = JSON.parse(resetResponse3.payload);
      const errorMessage = responseBody.message || responseBody.error || '';
      if (errorMessage.includes('cannot reuse a password')) {
        console.log('✅ HTTP API prevents reuse of password that was just set');
      } else {
        throw new Error(`HTTP API rejected password but not for reuse reason. Message: ${errorMessage}`);
      }
    } else {
      throw new Error(`Expected 400 for immediate password reuse, got ${resetResponse3.statusCode}`);
    }

    console.log('\n🎉 All password reuse prevention HTTP tests passed!');

  } catch (error) {
    console.error('❌ Password reuse prevention HTTP test failed:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  } finally {
    // Cleanup test user
    if (testUserId) {
      try {
        await prisma.user.delete({ where: { id: testUserId } });
        console.log('✅ Test user cleaned up');
      } catch (cleanupError) {
        console.error('❌ Failed to cleanup test user:', cleanupError.message);
      }
    }
    
    // Close connections
    await app.close();
    await prisma.$disconnect();
    
    // Close queue service connections if available
    try {
      const { queueService } = await import('../dist/src/services/queue.service.js');
      if (queueService.isReady()) {
        await queueService.close();
      }
    } catch (err) {
      // Queue service might not be available
    }
  }
}

// Run all HTTP tests
async function runPasswordReuseHTTPTests() {
  try {
    await testPasswordReuseViaHTTP();
    
    console.log('\n✨ Password reuse prevention HTTP tests completed successfully!');
    console.log('\n📋 HTTP Integration Test Summary:');
    console.log('  ✅ Password reuse prevention via POST /api/auth/reset-password/:token');
    console.log('  ✅ Rejection of passwords in user history');
    console.log('  ✅ Acceptance of new passwords not in history');
    console.log('  ✅ Proper storage of new passwords in history');
    console.log('  ✅ Prevention of immediate password reuse');
    console.log('  ✅ Correct HTTP status codes and error messages');
    console.log('\n🔐 Password reuse prevention HTTP API is fully functional!');
    
    // Clean exit
    process.exit(0);
  } catch (error) {
    console.error('❌ Password reuse prevention HTTP test suite failed:', error.message);
    process.exit(1);
  }
}

runPasswordReuseHTTPTests(); 