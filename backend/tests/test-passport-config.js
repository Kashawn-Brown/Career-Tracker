/**
 * Quick test script to verify Passport configuration
 * This is a temporary test file to ensure passport setup works
 */

// Load environment variables first
import 'dotenv/config';
import { PassportConfig, AuthProvider } from '../src/config/passport.config.js';

async function testPassportConfig() {
  console.log('🧪 Testing Passport Configuration...\n');

  try {
    // Test 1: Check environment configuration
    console.log('1. Checking environment configuration...');
    console.log('GOOGLE_CLIENT_ID exists:', !!process.env.GOOGLE_CLIENT_ID);
    console.log('GOOGLE_CLIENT_SECRET exists:', !!process.env.GOOGLE_CLIENT_SECRET);
    console.log('LINKEDIN_CLIENT_ID exists:', !!process.env.LINKEDIN_CLIENT_ID);
    console.log('LINKEDIN_CLIENT_SECRET exists:', !!process.env.LINKEDIN_CLIENT_SECRET);

    // Test 2: Check configured providers
    console.log('\n2. Testing configured providers...');
    const configuredProviders = PassportConfig.getConfiguredProviders();
    console.log('✅ Configured providers:', configuredProviders);

    // Test 3: Check AuthProvider enum
    console.log('\n3. Testing AuthProvider enum...');
    console.log('✅ AuthProvider.GOOGLE:', AuthProvider.GOOGLE);
    console.log('✅ AuthProvider.LINKEDIN:', AuthProvider.LINKEDIN);
    console.log('✅ AuthProvider.LOCAL:', AuthProvider.LOCAL);

    // Test 4: Initialize Passport (basic check)
    console.log('\n4. Testing Passport initialization...');
    const passportInstance = PassportConfig.initialize();
    console.log('✅ Passport instance initialized:', !!passportInstance);
    console.log('✅ Passport has _strategies:', !!passportInstance._strategies);

    // Test 5: Check if strategies are registered (if credentials exist)
    console.log('\n5. Checking registered strategies...');
    const strategies = Object.keys(passportInstance._strategies || {});
    console.log('✅ Registered strategies:', strategies);

    if (configuredProviders.google && !strategies.includes('google')) {
      console.log('⚠️  Google credentials exist but strategy not registered');
    }
    if (configuredProviders.linkedin && !strategies.includes('linkedin')) {
      console.log('⚠️  LinkedIn credentials exist but strategy not registered');
    }

    console.log('\n🎉 Passport configuration tests completed!');

    // Display setup status
    console.log('\n📋 OAuth Setup Status:');
    console.log('- Google OAuth:', configuredProviders.google ? '✅ Ready' : '❌ Not configured');
    console.log('- LinkedIn OAuth:', configuredProviders.linkedin ? '✅ Ready' : '❌ Not configured');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testPassportConfig(); 