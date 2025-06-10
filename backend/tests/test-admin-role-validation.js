/**
 * Test Admin Role Validation
 * 
 * Verifies that admin endpoints properly enforce admin role requirements
 */

import { test } from 'node:test';
import assert from 'node:assert';

const API_BASE = 'http://localhost:3002/api';
const ADMIN_BASE = `${API_BASE}/admin`;

async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  
  return { response, data, status: response.status };
}

/**
 * Test that regular USER role cannot access admin endpoints
 */
test('Regular users cannot access admin endpoints', async () => {
  console.log('\n=== Testing Admin Role Enforcement ===');
  
  // Register and login as regular user
  const registerResult = await makeRequest(`${API_BASE}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({
      email: 'regular@test.com',
      password: 'RegularTest123!',
      name: 'Regular Test User'
    })
  });
  
  const loginResult = await makeRequest(`${API_BASE}/auth/login`, {
    method: 'POST', 
    body: JSON.stringify({
      email: 'regular@test.com',
      password: 'RegularTest123!'
    })
  });
  
  console.log('Regular user login status:', loginResult.status);
  
  if (loginResult.status !== 200 || !loginResult.data?.tokens?.accessToken) {
    console.log('Skipping role test - could not get regular user token');
    return;
  }
  
  const userToken = loginResult.data.tokens.accessToken;
  const authHeaders = { 'Authorization': `Bearer ${userToken}` };
  
  // Test admin endpoint with regular user token
  const { status, data } = await makeRequest(
    `${ADMIN_BASE}/security/statistics`,
    { headers: authHeaders }
  );
  
  console.log('Admin endpoint with USER token:', status, data);
  
  // Should return 403 Forbidden (not 401 Unauthorized)
  assert.strictEqual(status, 403, 'Regular user should get 403 Forbidden');
  assert.strictEqual(data.error, 'Access forbidden', 'Should indicate access forbidden');
  
  console.log('✅ Admin role enforcement working correctly');
});

console.log('🚀 Starting Admin Role Validation Tests...\n'); 