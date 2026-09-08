const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function main() {
  const screenshotsDir = path.join(__dirname, '../public/screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  
  // Mobile viewport: iPhone 13 / Modern Android standard
  await page.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });

  const targets = [
    { name: '01_home.png', url: 'http://localhost:3000/' },
    { name: '02_catalog.png', url: 'http://localhost:3000/catalog' },
    { name: '03_product_detail.png', url: 'http://localhost:3000/catalog/prod-001' },
    { name: '04_farms.png', url: 'http://localhost:3000/farms' },
    { name: '05_register.png', url: 'http://localhost:3000/member/register' },
    { name: '06_dashboard.png', url: 'http://localhost:3000/member/dashboard', setup: async (p) => {
      await p.evaluate(() => {
        localStorage.setItem('nsw_current_user_v1', 'mem-001');
      });
    }},
    { name: '07_admin_lock.png', url: 'http://localhost:3000/admin', setup: async (p) => {
      await p.evaluate(() => {
        localStorage.removeItem('nsw_admin_session_token');
        sessionStorage.removeItem('nsw_admin_session_token');
        localStorage.setItem('nsw_current_user_v1', 'guest');
      });
    }},
    { name: '08_admin_dashboard.png', url: 'http://localhost:3000/admin', setup: async (p) => {
      await p.evaluate(() => {
        localStorage.setItem('nsw_admin_session_token', 'authenticated');
        sessionStorage.setItem('nsw_admin_session_token', 'authenticated');
        localStorage.setItem('nsw_current_user_v1', 'admin-001');
      });
    }},
    { name: '09_rich_menu.png', url: 'http://localhost:3000/admin/rich-menu' },
  ];

  for (const t of targets) {
    console.log(`Navigating to ${t.url} ...`);
    await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 1500));
    
    if (t.setup) {
      await t.setup(page);
      await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise(r => setTimeout(r, 1500));
    }

    // Check overflow
    const overflowInfo = await page.evaluate(() => {
      const docW = document.documentElement.scrollWidth;
      const bodyW = document.body.scrollWidth;
      const innerW = window.innerWidth;
      const culprits = [];
      document.querySelectorAll('*').forEach(el => {
        if (el.scrollWidth > innerW + 2) {
          culprits.push({ tag: el.tagName, id: el.id, cls: (el.className || '').toString().slice(0, 50), w: el.scrollWidth });
        }
      });
      return { docW, bodyW, innerW, culprits: culprits.slice(0, 5) };
    });

    console.log(`[${t.name}] Viewport: ${overflowInfo.innerW}, DocWidth: ${overflowInfo.docW}`);
    if (overflowInfo.culprits.length > 0) {
      console.warn(`  WARNING: Overflows found in ${t.name}:`, overflowInfo.culprits);
    }

    const outPath = path.join(screenshotsDir, t.name);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`Saved screenshot to ${outPath}`);
  }

  await browser.close();
  console.log('All screenshots captured successfully!');
}

main().catch(err => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
