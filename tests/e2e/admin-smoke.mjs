import puppeteer from 'puppeteer';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const PASSCODE = process.env.ADMIN_PASSCODE || 'agrinature2026';

async function runSmokeTests() {
  console.log('🚀 Starting Puppeteer E2E Smoke Tests on:', BASE_URL);
  console.log('🔑 Using configured admin passcode length:', PASSCODE ? PASSCODE.length : 0);
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    page.on('response', async (res) => {
      if (res.url().includes('/api/admin/auth')) {
        const json = await res.json().catch(() => ({}));
        console.log(`  📡 [HTTP ${res.status()}] ${res.request().method()} ${res.url()} ->`, json);
      }
    });

    // -------------------------------------------------------------
    // Test 1: Public Homepage Health Check
    // -------------------------------------------------------------
    console.log('\n[Test 1] Checking Public Homepage...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const title = await page.title();
    console.log(`  ✓ Page title: "${title}"`);
    if (!title) throw new Error('Home page title is empty!');

    // -------------------------------------------------------------
    // Test 2: Admin Locked Gate & Wrong Passcode Rejection
    // -------------------------------------------------------------
    console.log('\n[Test 2] Testing Admin Gate with Incorrect Passcode...');
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded', timeout: 15000 });

    const inputSelector = 'input[placeholder*="กรอกรหัสผ่าน"]';
    await page.waitForSelector(inputSelector, { timeout: 8000 });
    console.log('  ✓ Admin passcode input detected');

    // Focus and type wrong password
    await page.focus(inputSelector);
    await page.type(inputSelector, 'invalid_wrong_passcode');
    const submitBtnSelector = 'button[type="submit"]';

    const [failedResponse] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/api/admin/auth') && res.request().method() === 'POST'
      ),
      page.click(submitBtnSelector),
    ]);
    const failedData = await failedResponse.json().catch(() => ({}));
    console.log(`  ✓ Server responded with status: ${failedResponse.status()} (${failedData.message || ''})`);
    if (failedResponse.status() !== 401) {
      throw new Error(`Expected 401 for wrong passcode, got ${failedResponse.status()}`);
    }

    // Wait for error message rendered
    await page.waitForFunction(
      () => document.body.innerText.includes('รหัสผ่าน') || document.body.innerText.includes('ไม่ถูกต้อง'),
      { timeout: 8000 }
    );
    console.log('  ✓ Incorrect passcode properly rejected with error message in UI');

    // -------------------------------------------------------------
    // Test 3: Admin Login with Correct Passcode & Cookie Issuance
    // -------------------------------------------------------------
    console.log('\n[Test 3] Testing Admin Login with Correct Passcode...');
    
    // Clear React controlled input cleanly
    await page.focus(inputSelector);
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      set.call(el, '');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, inputSelector);

    // Type the exact passcode
    await page.type(inputSelector, PASSCODE);

    const actualTypedValue = await page.$eval(inputSelector, (el) => el.value);
    console.log(`  ✓ Input cleared and retyped (length: ${actualTypedValue.length})`);

    // Click submit and wait for response from auth API
    const [authResponse] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/api/admin/auth') && res.request().method() === 'POST'
      ),
      page.click(submitBtnSelector),
    ]);

    const authData = await authResponse.json().catch(() => ({}));
    console.log(`  ✓ Auth API responded with status: ${authResponse.status()} (${authData.message || ''})`);

    if (authResponse.status() !== 200) {
      throw new Error(`Auth failed with status ${authResponse.status()}: ${JSON.stringify(authData)}`);
    }

    // Wait for page reload to complete and login gate to disappear
    await page.waitForFunction(
      () => !document.querySelector('input[placeholder*="กรอกรหัสผ่าน"]'),
      { timeout: 15000 }
    );

    // Verify session cookie was set in browser
    const cookies = await page.cookies();
    const adminCookie = cookies.find((c) => c.name === 'nsw_admin_auth_session');
    if (!adminCookie) {
      throw new Error('Admin session cookie (nsw_admin_auth_session) was not found in browser!');
    }
    console.log(`  ✓ HTTP-Only Admin Session Cookie confirmed: ${adminCookie.name} (HttpOnly: ${adminCookie.httpOnly})`);
    console.log('  ✓ Admin dashboard unlocked and login gate disappeared');

    // -------------------------------------------------------------
    // Test 4: Real User Sign Out Flow
    // -------------------------------------------------------------
    console.log('\n[Test 4] Testing Real User Sign Out Flow...');
    
    // Click the actual "ออกจากระบบแอดมิน" button in the UI and wait for navigation
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
      page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const logoutBtn = btns.find((b) => b.textContent && b.textContent.includes('ออกจากระบบแอดมิน'));
        if (logoutBtn) {
          logoutBtn.click();
        } else {
          throw new Error('Could not find "ออกจากระบบแอดมิน" button');
        }
      }),
    ]);
    console.log(`  ✓ Successfully navigated after sign out: ${page.url()}`);

    // Try visiting /admin again
    console.log('  Testing access to /admin after logout...');
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector(inputSelector, { timeout: 8000 });
    console.log('  ✓ Gate locked again: Admin Passcode input is displayed!');

    console.log('\n========================================');
    console.log('🎉 ALL E2E SMOKE TESTS PASSED SUCCESSFULLY!');
    console.log('========================================\n');
  } finally {
    if (browser) await browser.close();
  }
}

runSmokeTests().catch((err) => {
  console.error('\n❌ E2E Smoke Test Failed:', err.message);
  process.exit(1);
});
