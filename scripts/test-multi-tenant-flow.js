// ==============================================================================
// 10-Step Multi-Tenant Multi-Business Verification Script
// ==============================================================================

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('====================================================');
  console.log('STARTING MULTI-BUSINESS MULTI-TENANT VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // TEST 1: Create Business A (Royal Spice Cafe)
  console.log('\n--- Step 1: Create Business A ---');
  const resA = await fetch(`${BASE_URL}/api/register-owner`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'owner-a@royalspice.com',
      password: 'Spice@01',
      businessName: 'Royal Spice Cafe',
      googleReviewLink: 'https://g.page/r/royal-spice/review',
      category: 'cafe',
      otp: 'BYPASS_TEST_OTP',
    }),
  });
  const dataA = await resA.json();
  assert(dataA.success === true, 'Business A registered successfully');
  const bizA = dataA.business;
  console.log(`Business A Details: ID=${bizA.id} (UUID), Slug=${bizA.slug}, Name=${bizA.name}`);
  assert(Boolean(bizA.id) && bizA.id.length > 20, 'Business A has unique UUID internal ID');
  assert(bizA.slug.startsWith('royal-spice-cafe'), 'Business A has public URL-safe slug starting with royal-spice-cafe');

  // TEST 2: Create Business B (Jaipur Gems & Jewels)
  console.log('\n--- Step 2: Create Business B ---');
  const resB = await fetch(`${BASE_URL}/api/register-owner`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'owner-b@jaipurgems.com',
      password: 'Gems#002',
      businessName: 'Jaipur Gems & Jewels',
      googleReviewLink: 'https://g.page/r/jaipur-gems/review',
      category: 'clothing',
      otp: 'BYPASS_TEST_OTP',
    }),
  });
  const dataB = await resB.json();
  assert(dataB.success === true, 'Business B registered successfully');
  const bizB = dataB.business;
  console.log(`Business B Details: ID=${bizB.id} (UUID), Slug=${bizB.slug}, Name=${bizB.name}`);
  assert(Boolean(bizB.id) && bizB.id !== bizA.id, 'Business B has distinct unique UUID');
  assert(bizB.slug.startsWith('jaipur-gems-jewels'), 'Business B has public URL-safe slug starting with jaipur-gems-jewels');

  // TEST 3: Login as Owner A
  console.log('\n--- Step 3: Login as Owner A ---');
  const loginResA = await fetch(`${BASE_URL}/api/login-owner`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'owner-a@royalspice.com',
      password: 'Spice@01',
    }),
  });
  const loginDataA = await loginResA.json();
  assert(loginDataA.success === true, 'Owner A logged in successfully');
  const tokenA = loginDataA.token;
  assert(Boolean(tokenA), 'Owner A received cryptographic signed session token');
  console.log(`Owner A authorized businesses: ${JSON.stringify(loginDataA.user.authorizedBusinessIds)}`);

  // TEST 4: Verify Owner A can access only Business A
  console.log('\n--- Step 4: Verify Owner A can access Business A ---');
  const dashResA = await fetch(`${BASE_URL}/api/dashboard?businessId=${bizA.id}`, {
    headers: { 'Authorization': `Bearer ${tokenA}` },
  });
  const dashDataA = await dashResA.json();
  assert(dashResA.status === 200 && dashDataA.success === true, 'Owner A successfully accesses Business A dashboard');
  assert(dashDataA.businessInfo.slug === bizA.slug, 'Dashboard returned correct Business A data');

  // TEST 5 & 6: Attempt to access Business B using Owner A session (Anti-IDOR Attack Simulation)
  console.log('\n--- Step 5 & 6: IDOR Simulation (Owner A attempts to view Business B) ---');
  const attackRes = await fetch(`${BASE_URL}/api/dashboard?businessId=${bizB.id}`, {
    headers: { 'Authorization': `Bearer ${tokenA}` },
  });
  const attackData = await attackRes.json();
  console.log(`Attacker received HTTP Status: ${attackRes.status}, Message: ${attackData.message}`);
  assert(attackRes.status === 403, 'Server strictly returned HTTP 403 Forbidden for cross-tenant request');
  assert(attackData.success === false, 'Attack payload rejected with success=false');
  assert(attackData.message.includes('Access Denied'), 'Response explicitly states Access Denied');

  // Also test slug tampering (b-jaipur-gems-jewels)
  const attackSlugRes = await fetch(`${BASE_URL}/api/dashboard?businessId=jaipur-gems-jewels`, {
    headers: { 'Authorization': `Bearer ${tokenA}` },
  });
  assert(attackSlugRes.status === 403, 'Slug tampering also blocked with HTTP 403 Forbidden');

  // TEST 7: Login as Owner B
  console.log('\n--- Step 7: Login as Owner B ---');
  const loginResB = await fetch(`${BASE_URL}/api/login-owner`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'owner-b@jaipurgems.com',
      password: 'Gems#002',
    }),
  });
  const loginDataB = await loginResB.json();
  assert(loginDataB.success === true, 'Owner B logged in successfully');
  const tokenB = loginDataB.token;
  assert(Boolean(tokenB), 'Owner B received valid session token');

  // TEST 8: Verify Owner B can access only Business B (and is blocked from Business A)
  console.log('\n--- Step 8: Verify Owner B can access only Business B ---');
  const dashResB = await fetch(`${BASE_URL}/api/dashboard?businessId=${bizB.id}`, {
    headers: { 'Authorization': `Bearer ${tokenB}` },
  });
  const dashDataB = await dashResB.json();
  assert(dashResB.status === 200 && dashDataB.success === true, 'Owner B successfully accesses Business B');
  assert(dashDataB.businessInfo.slug === bizB.slug, 'Dashboard returned correct Business B data');

  // Verify Owner B cannot access Business A
  const attackResB = await fetch(`${BASE_URL}/api/dashboard?businessId=${bizA.id}`, {
    headers: { 'Authorization': `Bearer ${tokenB}` },
  });
  assert(attackResB.status === 403, 'Owner B blocked from Business A with HTTP 403 Forbidden');

  // TEST 9 & 10: Open /r/:businessSlug for both businesses
  console.log('\n--- Step 9 & 10: Public Routes Verification ---');
  const publicResA = await fetch(`${BASE_URL}/r/${bizA.slug}`);
  const htmlA = await publicResA.text();
  assert(publicResA.status === 200, `/r/${bizA.slug} returns HTTP 200 OK`);
  assert(htmlA.includes('Royal Spice Cafe'), 'Public page A displays Royal Spice Cafe');
  assert(!htmlA.includes('owner-a@royalspice.com'), 'Public page A does NOT leak owner email');
  assert(!htmlA.includes('Spice@01'), 'Public page A does NOT leak owner password');

  const publicResB = await fetch(`${BASE_URL}/r/${bizB.slug}`);
  const htmlB = await publicResB.text();
  assert(publicResB.status === 200, `/r/${bizB.slug} returns HTTP 200 OK`);
  assert(htmlB.includes('Jaipur Gems &amp; Jewels') || htmlB.includes('Jaipur Gems & Jewels'), 'Public page B displays Jaipur Gems & Jewels');
  assert(!htmlB.includes('owner-b@jaipurgems.com'), 'Public page B does NOT leak owner email');
  assert(!htmlB.includes('Gems#002'), 'Public page B does NOT leak owner password');

  // BONUS TEST: Submit review for Business A and verify cross-tenant isolation
  console.log('\n--- Step 11: Review Submission & Cross-Tenant Data Isolation ---');
  const scanRes = await fetch(`${BASE_URL}/api/log-scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessId: bizA.id, source: 'nfc' }),
  });
  assert(scanRes.status === 200, 'NFC scan logged for Business A');

  const reviewRes = await fetch(`${BASE_URL}/api/submit-feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      businessId: bizA.id,
      rating: 5,
      selectedTags: ['Fast Service', 'Polite Staff'],
      reviewText: 'Amazing food at Royal Spice Cafe!',
      postedToGoogle: true,
      source: 'nfc',
    }),
  });
  const reviewData = await reviewRes.json();
  assert(reviewRes.status === 200 && reviewData.success === true, '5-Star Google review submitted for Business A');

  // Verify Owner A sees the review
  const dashVerifyA = await fetch(`${BASE_URL}/api/dashboard?businessId=${bizA.id}`, {
    headers: { 'Authorization': `Bearer ${tokenA}` },
  });
  const dashVerifyDataA = await dashVerifyA.json();
  assert(dashVerifyDataA.metrics.postedToGoogle >= 1, 'Business A dashboard metrics reflect the new review');

  // Verify Owner B dashboard has ZERO data from Business A (strict isolation)
  const dashVerifyB = await fetch(`${BASE_URL}/api/dashboard?businessId=${bizB.id}`, {
    headers: { 'Authorization': `Bearer ${tokenB}` },
  });
  const dashVerifyDataB = await dashVerifyB.json();
  assert(dashVerifyDataB.metrics.postedToGoogle === 0, 'Business B dashboard is completely isolated (0 reviews from Business A)');

  // BONUS TEST: Non-existent slug returns 404
  const invalidRes = await fetch(`${BASE_URL}/r/non-existent-fake-store-9999`);
  assert(invalidRes.status === 404, 'Invalid store slug returns clean 404 Not Found');

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
