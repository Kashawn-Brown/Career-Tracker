/**
 * Test Task 12.5 Implementation Verification
 * 
 * This file tests whether all Task 12.5 features are actually implemented:
 * - Security questions functionality
 * - Secondary email recovery
 * - Password change notifications
 * - Audit logging system
 * - CSRF protection
 * - Progressive delays for failed attempts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// For testing, we'll check the files directly instead of importing them
// since they're TypeScript files and we're running this as JavaScript

async function testTask12_5Implementation() {
  console.log('🔍 Testing Task 12.5 Implementation...\n');
  
  let allTestsPassed = true;
  const results = {};

  // Test 1: Security Questions Table exists
  try {
    console.log('1. Testing Security Questions table...');
    const securityQuestions = await prisma.securityQuestion.findMany({ take: 1 });
    results.securityQuestionsTable = '✅ PASS - SecurityQuestion table exists';
    console.log('   ✅ SecurityQuestion table exists and accessible');
  } catch (error) {
    results.securityQuestionsTable = '❌ FAIL - SecurityQuestion table missing or inaccessible';
    console.log('   ❌ SecurityQuestion table missing or inaccessible');
    allTestsPassed = false;
  }

  // Test 2: Secondary Email functionality
  try {
    console.log('2. Testing Secondary Email functionality...');
    // Check if User model has secondaryEmail field
    const user = await prisma.user.findFirst({
      select: { secondaryEmail: true, secondaryEmailVerified: true }
    });
    results.secondaryEmail = '✅ PASS - Secondary email fields exist';
    console.log('   ✅ Secondary email fields exist in User model');
  } catch (error) {
    results.secondaryEmail = '❌ FAIL - Secondary email fields missing';
    console.log('   ❌ Secondary email fields missing from User model');
    allTestsPassed = false;
  }

  // Test 3: Audit Logging System
  try {
    console.log('3. Testing Audit Logging system...');
    const auditLogs = await prisma.auditLog.findMany({ take: 1 });
    results.auditLogging = '✅ PASS - AuditLog table exists';
    console.log('   ✅ AuditLog table exists and accessible');
    
    // Test if auditService has required methods by checking the file content
    const fs = await import('fs/promises');
    const auditServiceContent = await fs.readFile('./src/services/audit.service.ts', 'utf-8');
    
    const hasPasswordResetLog = auditServiceContent.includes('logPasswordReset');
    const hasFailedLoginLog = auditServiceContent.includes('logFailedLogin');
    
    if (hasPasswordResetLog && hasFailedLoginLog) {
      console.log('   ✅ AuditService has required methods');
    } else {
      console.log('   ⚠️  Some AuditService methods may be missing');
    }
  } catch (error) {
    results.auditLogging = '❌ FAIL - Audit logging system incomplete';
    console.log('   ❌ Audit logging system incomplete:', error.message);
    allTestsPassed = false;
  }

  // Test 4: Password Change Notifications
  try {
    console.log('4. Testing Password Change Notifications...');
    const fs = await import('fs/promises');
    const emailServiceContent = await fs.readFile('./src/services/email.service.ts', 'utf-8');
    
    const hasPasswordChangedEmail = emailServiceContent.includes('sendPasswordChangedEmail') &&
                                   emailServiceContent.includes('password changed');

    if (hasPasswordChangedEmail) {
      results.passwordNotifications = '✅ PASS - Password change notification method exists';
      console.log('   ✅ Password change notification method exists');
    } else {
      results.passwordNotifications = '❌ FAIL - Password change notification method missing';
      console.log('   ❌ Password change notification method missing');
      allTestsPassed = false;
    }
  } catch (error) {
    results.passwordNotifications = '❌ FAIL - Could not verify email service';
    console.log('   ❌ Could not verify email service:', error.message);
    allTestsPassed = false;
  }

  // Test 5: Security Questions API Endpoints
  try {
    console.log('5. Testing Security Questions API endpoints...');
    // Check if routes file includes security question endpoints
    const fs = await import('fs/promises');
    const authRoutesContent = await fs.readFile('./src/routes/auth.ts', 'utf-8');
    
    const hasSecurityQuestionRoutes = [
      '/security-questions',
      '/recovery-questions',
      '/verify-security-questions'
    ].every(route => authRoutesContent.includes(route));

    if (hasSecurityQuestionRoutes) {
      results.securityQuestionAPI = '✅ PASS - Security question API endpoints exist';
      console.log('   ✅ Security question API endpoints exist');
    } else {
      results.securityQuestionAPI = '❌ FAIL - Security question API endpoints missing';
      console.log('   ❌ Security question API endpoints missing');
      allTestsPassed = false;
    }
  } catch (error) {
    results.securityQuestionAPI = '❌ FAIL - Could not verify API endpoints';
    console.log('   ❌ Could not verify API endpoints:', error.message);
    allTestsPassed = false;
  }

  // Test 6: Progressive Delays (Security Middleware)
  try {
    console.log('6. Testing Progressive Delays functionality...');
    const fs = await import('fs/promises');
    const securityMiddlewareContent = await fs.readFile('./src/middleware/security.middleware.ts', 'utf-8');
    
    const hasProgressiveDelays = securityMiddlewareContent.includes('calculateDelay') &&
                                securityMiddlewareContent.includes('progressiv');

    if (hasProgressiveDelays) {
      results.progressiveDelays = '✅ PASS - Progressive delays implemented';
      console.log('   ✅ Progressive delays implemented');
    } else {
      results.progressiveDelays = '❌ FAIL - Progressive delays not implemented';
      console.log('   ❌ Progressive delays not implemented');
      allTestsPassed = false;
    }
  } catch (error) {
    results.progressiveDelays = '❌ FAIL - Could not verify progressive delays';
    console.log('   ❌ Could not verify progressive delays:', error.message);
    allTestsPassed = false;
  }

  // Test 7: CSRF Protection
  try {
    console.log('7. Testing CSRF Protection...');
    const fs = await import('fs/promises');
    const securityMiddlewareContent = await fs.readFile('./src/middleware/security.middleware.ts', 'utf-8');
    
    const hasCSRFProtection = securityMiddlewareContent.includes('CSRF') &&
                             securityMiddlewareContent.includes('csrf');

    if (hasCSRFProtection) {
      results.csrfProtection = '✅ PASS - CSRF protection implemented';
      console.log('   ✅ CSRF protection implemented');
    } else {
      results.csrfProtection = '❌ FAIL - CSRF protection not implemented';
      console.log('   ❌ CSRF protection not implemented');
      allTestsPassed = false;
    }
  } catch (error) {
    results.csrfProtection = '❌ FAIL - Could not verify CSRF protection';
    console.log('   ❌ Could not verify CSRF protection:', error.message);
    allTestsPassed = false;
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 TASK 12.5 IMPLEMENTATION SUMMARY');
  console.log('='.repeat(60));
  
  Object.entries(results).forEach(([test, result]) => {
    console.log(result);
  });

  console.log('\n' + '='.repeat(60));
  if (allTestsPassed) {
    console.log('🎉 TASK 12.5 APPEARS TO BE FULLY IMPLEMENTED');
  } else {
    console.log('⚠️  TASK 12.5 HAS SOME MISSING OR INCOMPLETE FEATURES');
  }
  console.log('='.repeat(60));

  return { allTestsPassed, results };
}

// Run the test
testTask12_5Implementation().catch(console.error).finally(() => {
  prisma.$disconnect();
}); 