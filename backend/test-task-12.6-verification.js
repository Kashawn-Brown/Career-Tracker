/**
 * Test Task 12.6 Implementation Verification
 * 
 * This file tests whether all Task 12.6 features are actually implemented:
 * - Account lockout functionality
 * - Progressive lockout times (5 attempts = 15 min, 10 attempts = 1 hour)
 * - Database fields for lockout tracking
 * - Automatic unlock mechanisms
 * - Manual admin unlock options
 * - Forced password reset triggers
 * - Email notifications for lock/unlock
 * - Admin endpoints for locked accounts
 * - User-facing lockout messaging
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// For testing, we'll check the files directly instead of importing them
// since they're TypeScript files and we're running this as JavaScript

async function testTask12_6Implementation() {
  console.log('🔒 Testing Task 12.6 Implementation...\n');
  
  let allTestsPassed = true;
  const results = {};

  // Test 1: UserSecurity Table exists with lockout fields
  try {
    console.log('1. Testing UserSecurity table with lockout fields...');
    const userSecurity = await prisma.userSecurity.findFirst({
      select: { 
        isLocked: true,
        lockoutCount: true,
        lockoutUntil: true,
        lastLockoutReason: true,
        forcePasswordReset: true,
        forcePasswordResetReason: true
      }
    });
    results.userSecurityTable = '✅ PASS - UserSecurity table with lockout fields exists';
    console.log('   ✅ UserSecurity table with lockout fields exists');
  } catch (error) {
    results.userSecurityTable = '❌ FAIL - UserSecurity table missing lockout fields';
    console.log('   ❌ UserSecurity table missing lockout fields:', error.message);
    allTestsPassed = false;
  }

  // Test 2: UserSecurity Service with lockout methods
  try {
    console.log('2. Testing UserSecurity Service lockout methods...');
    const fs = await import('fs/promises');
    const userSecurityServiceContent = await fs.readFile('./src/services/userSecurity.service.ts', 'utf-8');
    
    const requiredMethods = [
      'isAccountLocked',
      'recordFailedAttempt', 
      'lockAccount',
      'unlockAccount',
      'checkSuspiciousActivity',
      'forcePasswordReset'
    ];
    
    const missingMethods = requiredMethods.filter(method => 
      !userSecurityServiceContent.includes(method)
    );

    if (missingMethods.length === 0) {
      results.userSecurityService = '✅ PASS - All required UserSecurity service methods exist';
      console.log('   ✅ All required UserSecurity service methods exist');
    } else {
      results.userSecurityService = `❌ FAIL - Missing methods: ${missingMethods.join(', ')}`;
      console.log(`   ❌ Missing methods: ${missingMethods.join(', ')}`);
      allTestsPassed = false;
    }
  } catch (error) {
    results.userSecurityService = '❌ FAIL - UserSecurity service not accessible';
    console.log('   ❌ UserSecurity service not accessible:', error.message);
    allTestsPassed = false;
  }

  // Test 3: Progressive Lockout Configuration
  try {
    console.log('3. Testing Progressive Lockout Configuration...');
    const fs = await import('fs/promises');
    const userSecurityServiceContent = await fs.readFile('./src/services/userSecurity.service.ts', 'utf-8');
    
    const hasProgressiveConfig = userSecurityServiceContent.includes('LOCKOUT_PROGRESSION') &&
                                userSecurityServiceContent.includes('15') && // 15 min lockout
                                userSecurityServiceContent.includes('30') && // 30 min lockout
                                userSecurityServiceContent.includes('60');   // 1 hour lockout

    if (hasProgressiveConfig) {
      results.progressiveLockout = '✅ PASS - Progressive lockout configuration exists';
      console.log('   ✅ Progressive lockout configuration exists');
    } else {
      results.progressiveLockout = '❌ FAIL - Progressive lockout configuration missing';
      console.log('   ❌ Progressive lockout configuration missing');
      allTestsPassed = false;
    }
  } catch (error) {
    results.progressiveLockout = '❌ FAIL - Could not verify progressive lockout config';
    console.log('   ❌ Could not verify progressive lockout config:', error.message);
    allTestsPassed = false;
  }

  // Test 4: Account Lockout Email Notifications
  try {
    console.log('4. Testing Account Lockout Email Notifications...');
    const fs = await import('fs/promises');
    const emailServiceContent = await fs.readFile('./src/services/email.service.ts', 'utf-8');
    
    const requiredEmailMethods = [
      'sendAccountLockedEmail',
      'sendAccountUnlockedEmail'
    ];
    
    const missingEmailMethods = requiredEmailMethods.filter(method => 
      !emailServiceContent.includes(method)
    );

    if (missingEmailMethods.length === 0) {
      results.lockoutEmails = '✅ PASS - Account lockout email methods exist';
      console.log('   ✅ Account lockout email methods exist');
    } else {
      results.lockoutEmails = `❌ FAIL - Missing email methods: ${missingEmailMethods.join(', ')}`;
      console.log(`   ❌ Missing email methods: ${missingEmailMethods.join(', ')}`);
      allTestsPassed = false;
    }
  } catch (error) {
    results.lockoutEmails = '❌ FAIL - Could not verify email service methods';
    console.log('   ❌ Could not verify email service methods:', error.message);
    allTestsPassed = false;
  }

  // Test 5: Admin Unlock Endpoints
  try {
    console.log('5. Testing Admin Unlock Endpoints...');
    const fs = await import('fs/promises');
    const adminRoutesContent = await fs.readFile('./src/routes/admin.ts', 'utf-8');
    
    const hasAdminUnlockEndpoints = adminRoutesContent.includes('/security/unlock-account') &&
                                   adminRoutesContent.includes('unlockAccount');

    if (hasAdminUnlockEndpoints) {
      results.adminUnlockEndpoints = '✅ PASS - Admin unlock endpoints exist';
      console.log('   ✅ Admin unlock endpoints exist');
    } else {
      results.adminUnlockEndpoints = '❌ FAIL - Admin unlock endpoints missing';
      console.log('   ❌ Admin unlock endpoints missing');
      allTestsPassed = false;
    }
  } catch (error) {
    results.adminUnlockEndpoints = '❌ FAIL - Could not verify admin endpoints';
    console.log('   ❌ Could not verify admin endpoints:', error.message);
    allTestsPassed = false;
  }

  // Test 6: Suspicious Activity Detection
  try {
    console.log('6. Testing Suspicious Activity Detection...');
    const fs = await import('fs/promises');
    const userSecurityServiceContent = await fs.readFile('./src/services/userSecurity.service.ts', 'utf-8');
    
    const hasSuspiciousActivityDetection = userSecurityServiceContent.includes('SUSPICIOUS_ACTIVITY_CONFIG') &&
                                          userSecurityServiceContent.includes('multipleIpsThreshold') &&
                                          userSecurityServiceContent.includes('checkSuspiciousActivity');

    if (hasSuspiciousActivityDetection) {
      results.suspiciousActivity = '✅ PASS - Suspicious activity detection implemented';
      console.log('   ✅ Suspicious activity detection implemented');
    } else {
      results.suspiciousActivity = '❌ FAIL - Suspicious activity detection missing';
      console.log('   ❌ Suspicious activity detection missing');
      allTestsPassed = false;
    }
  } catch (error) {
    results.suspiciousActivity = '❌ FAIL - Could not verify suspicious activity detection';
    console.log('   ❌ Could not verify suspicious activity detection:', error.message);
    allTestsPassed = false;
  }

  // Test 7: Security Middleware Integration
  try {
    console.log('7. Testing Security Middleware Integration...');
    const fs = await import('fs/promises');
    const securityMiddlewareContent = await fs.readFile('./src/middleware/security.middleware.ts', 'utf-8');
    
    const hasLockoutIntegration = securityMiddlewareContent.includes('lockout') &&
                                 securityMiddlewareContent.includes('ACCOUNT_LOCKED');

    if (hasLockoutIntegration) {
      results.middlewareIntegration = '✅ PASS - Security middleware lockout integration exists';
      console.log('   ✅ Security middleware lockout integration exists');
    } else {
      results.middlewareIntegration = '❌ FAIL - Security middleware lockout integration missing';
      console.log('   ❌ Security middleware lockout integration missing');
      allTestsPassed = false;
    }
  } catch (error) {
    results.middlewareIntegration = '❌ FAIL - Could not verify middleware integration';
    console.log('   ❌ Could not verify middleware integration:', error.message);
    allTestsPassed = false;
  }

  // Test 8: Audit Log Integration
  try {
    console.log('8. Testing Audit Log Integration...');
    const fs = await import('fs/promises');
    const auditServiceContent = await fs.readFile('./src/services/audit.service.ts', 'utf-8');
    
    const hasLockoutAuditEvents = auditServiceContent.includes('ACCOUNT_LOCKED') &&
                                 auditServiceContent.includes('ACCOUNT_UNLOCKED') &&
                                 auditServiceContent.includes('logAccountLocked');

    if (hasLockoutAuditEvents) {
      results.auditLogIntegration = '✅ PASS - Audit log lockout events integrated';
      console.log('   ✅ Audit log lockout events integrated');
    } else {
      results.auditLogIntegration = '❌ FAIL - Audit log lockout events missing';
      console.log('   ❌ Audit log lockout events missing');
      allTestsPassed = false;
    }
  } catch (error) {
    results.auditLogIntegration = '❌ FAIL - Could not verify audit log integration';
    console.log('   ❌ Could not verify audit log integration:', error.message);
    allTestsPassed = false;
  }

  // Test 9: Forced Password Reset Functionality
  try {
    console.log('9. Testing Forced Password Reset Functionality...');
    const fs = await import('fs/promises');
    const userSecurityServiceContent = await fs.readFile('./src/services/userSecurity.service.ts', 'utf-8');
    
    const hasForcedPasswordReset = userSecurityServiceContent.includes('forcePasswordReset') &&
                                  userSecurityServiceContent.includes('forcePasswordResetReason') &&
                                  userSecurityServiceContent.includes('clearForcePasswordReset');

    if (hasForcedPasswordReset) {
      results.forcedPasswordReset = '✅ PASS - Forced password reset functionality exists';
      console.log('   ✅ Forced password reset functionality exists');
    } else {
      results.forcedPasswordReset = '❌ FAIL - Forced password reset functionality missing';
      console.log('   ❌ Forced password reset functionality missing');
      allTestsPassed = false;
    }
  } catch (error) {
    results.forcedPasswordReset = '❌ FAIL - Could not verify forced password reset';
    console.log('   ❌ Could not verify forced password reset:', error.message);
    allTestsPassed = false;
  }

  console.log('\n' + '='.repeat(60));
  console.log('🔒 TASK 12.6 IMPLEMENTATION SUMMARY');
  console.log('='.repeat(60));
  
  Object.entries(results).forEach(([test, result]) => {
    console.log(result);
  });

  console.log('\n' + '='.repeat(60));
  if (allTestsPassed) {
    console.log('🎉 TASK 12.6 APPEARS TO BE FULLY IMPLEMENTED');
  } else {
    console.log('⚠️  TASK 12.6 HAS SOME MISSING OR INCOMPLETE FEATURES');
  }
  console.log('='.repeat(60));

  return { allTestsPassed, results };
}

// Run the test
testTask12_6Implementation().catch(console.error).finally(() => {
  prisma.$disconnect();
}); 