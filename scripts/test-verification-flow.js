const http = require('http');

async function postJson(url, data) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const body = JSON.stringify(data);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 3000,
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let responseData = '';
        res.on('data', (chunk) => (responseData += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(responseData) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: responseData });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function get(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.get(
      {
        hostname: parsed.hostname,
        port: parsed.port || 3000,
        path: parsed.pathname + parsed.search,
        method: 'GET',
      },
      (res) => {
        let responseData = '';
        res.on('data', (chunk) => (responseData += chunk));
        res.on('end', () => {
          resolve({ status: res.statusCode, body: responseData });
        });
      }
    );
    req.on('error', reject);
  });
}

async function runTests() {
  console.log('=== ReviewXpress Verification & Onboarding Test ===');

  const testEmail = 'kumawatgaurav203@gmail.com';
  console.log('\n[1] Testing /api/send-otp for email:', testEmail);
  const sendOtpRes = await postJson('http://localhost:3000/api/send-otp', { email: testEmail });
  console.log('Send OTP response status:', sendOtpRes.status, sendOtpRes.data);

  if (!sendOtpRes.data || !sendOtpRes.data.success || !sendOtpRes.data.otp) {
    console.error('FAIL: send-otp did not return success and valid OTP');
    process.exit(1);
  }
  const receivedOtp = sendOtpRes.data.otp;
  console.log('SUCCESS: OTP received/generated:', receivedOtp);

  console.log('\n[2] Testing /api/register-owner with the received OTP:');
  const regRes = await postJson('http://localhost:3000/api/register-owner', {
    businessName: 'Studio ' + Date.now().toString().slice(-4),
    email: testEmail,
    password: 'Gaur@270',
    googleReviewLink: 'https://maps.app.goo.gl/testlink',
    category: 'Studio',
    otp: receivedOtp,
  });
  console.log('Register response status:', regRes.status, regRes.data);

  if (!regRes.data || !regRes.data.success) {
    console.error('FAIL: register-owner failed');
    process.exit(1);
  }
  const storeSlug = regRes.data.business?.slug || regRes.data.store?.slug;
  console.log('SUCCESS: Store created successfully! Slug:', storeSlug);

  console.log('\n[3] Testing /api/login-owner:');
  const loginRes = await postJson('http://localhost:3000/api/login-owner', {
    email: testEmail,
    password: 'Gaur@270',
  });
  console.log('Login response status:', loginRes.status, loginRes.data?.success);
  if (!loginRes.data || !loginRes.data.success) {
    console.error('FAIL: login-owner failed');
    process.exit(1);
  }
  console.log('SUCCESS: Login owner succeeded!');

  console.log('\n[4] Testing public review page /r/' + storeSlug);
  const pageRes = await get('http://localhost:3000/r/' + storeSlug);
  console.log('Review page HTTP status:', pageRes.status);
  if (pageRes.status !== 200) {
    console.error('FAIL: Review page returned non-200 status');
    process.exit(1);
  }
  console.log('SUCCESS: Review page loaded with HTTP 200!');

  console.log('\n>>> ALL 4 VERIFICATION TESTS PASSED PERFECTLY! <<<');
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
