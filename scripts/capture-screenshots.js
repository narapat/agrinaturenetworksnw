const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const PASSCODE = process.env.ADMIN_PASSCODE || 'agrinature2026';

async function main() {
  const screenshotsDir = path.join(__dirname, '../public/screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const launchOptions = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  };

  if (fs.existsSync(chromePath)) {
    launchOptions.executablePath = chromePath;
  }

  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();

  // Mobile viewport: iPhone 13 / 14 / 15 standard (390 x 844)
  await page.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });

  const targets = [
    {
      name: '01_home.png',
      url: `${BASE_URL}/`,
      setup: async (p) => {
        await p.evaluate(() => {
          localStorage.setItem('nsw_current_user_v1', 'guest');
        });
      }
    },
    {
      name: '02_catalog.png',
      url: `${BASE_URL}/catalog`,
    },
    {
      name: '03_product_detail.png',
      url: `${BASE_URL}/catalog/prod-001`,
    },
    {
      name: '04_farms.png',
      url: `${BASE_URL}/farms`,
    },
    {
      name: '05_register.png',
      url: `${BASE_URL}/member/register`,
      setup: async (p) => {
        await p.evaluate(() => {
          localStorage.setItem('nsw_current_user_v1', 'guest');
        });
      }
    },
    {
      name: '05_add_product.png',
      url: `${BASE_URL}/member/add-product`,
      setup: async (p) => {
        await p.evaluate(() => {
          localStorage.removeItem('nsw_user_logged_out');
          sessionStorage.removeItem('nsw_user_logged_out');
          localStorage.setItem('nsw_current_user_v1', 'mem-001');
        });
      }
    },
    {
      name: '06_dashboard.png',
      url: `${BASE_URL}/member/dashboard`,
      setup: async (p) => {
        await p.evaluate(() => {
          localStorage.removeItem('nsw_user_logged_out');
          sessionStorage.removeItem('nsw_user_logged_out');
          localStorage.setItem('nsw_current_user_v1', 'mem-001');
        });
      }
    },
    {
      name: '07_admin_lock.png',
      url: `${BASE_URL}/admin`,
      setup: async (p) => {
        // Clear admin session & cookies to show locked gate
        await p.evaluate(async () => {
          await fetch('/api/admin/auth', { method: 'DELETE' }).catch(() => {});
          localStorage.removeItem('nsw_admin_session_token');
          sessionStorage.removeItem('nsw_admin_session_token');
          localStorage.setItem('nsw_user_logged_out', 'true');
          sessionStorage.setItem('nsw_user_logged_out', 'true');
          localStorage.setItem('nsw_current_user_v1', 'guest');
        });
        const clientCookies = await p.cookies();
        for (const c of clientCookies) {
          if (c.name === 'nsw_admin_auth_session') {
            await p.deleteCookie({ name: c.name });
          }
        }
      }
    },
    {
      name: '08_admin_dashboard.png',
      url: `${BASE_URL}/admin`,
      setup: async (p, passcode) => {
        // Authenticate with server API
        await p.evaluate(async (pass) => {
          localStorage.removeItem('nsw_user_logged_out');
          sessionStorage.removeItem('nsw_user_logged_out');
          localStorage.setItem('nsw_admin_session_token', 'authenticated');
          sessionStorage.setItem('nsw_admin_session_token', 'authenticated');
          localStorage.setItem('nsw_current_user_v1', 'admin-001');
          await fetch('/api/admin/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ passcode: pass })
          }).catch(() => {});
        }, passcode);
      }
    },
    {
      name: '08_admin_sku.png',
      url: `${BASE_URL}/admin`,
      setup: async (p, passcode) => {
        await p.evaluate(async (pass) => {
          localStorage.removeItem('nsw_user_logged_out');
          sessionStorage.removeItem('nsw_user_logged_out');
          localStorage.setItem('nsw_admin_session_token', 'authenticated');
          sessionStorage.setItem('nsw_admin_session_token', 'authenticated');
          localStorage.setItem('nsw_current_user_v1', 'admin-001');
          await fetch('/api/admin/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ passcode: pass })
          }).catch(() => {});
        }, passcode);
      },
      action: async (p) => {
        await p.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const catBtn = buttons.find(b => b.textContent && b.textContent.includes('จัดการหมวดหมู่'));
          if (catBtn) catBtn.click();
        });
        await new Promise(r => setTimeout(r, 800));
        await p.evaluate(() => {
          window.scrollTo(0, 580);
        });
        await new Promise(r => setTimeout(r, 800));
      }
    },
    {
      name: '09_rich_menu.png',
      url: `${BASE_URL}/admin/rich-menu`,
      setup: async (p, passcode) => {
        await p.evaluate(async (pass) => {
          localStorage.removeItem('nsw_user_logged_out');
          sessionStorage.removeItem('nsw_user_logged_out');
          localStorage.setItem('nsw_admin_session_token', 'authenticated');
          sessionStorage.setItem('nsw_admin_session_token', 'authenticated');
          localStorage.setItem('nsw_current_user_v1', 'admin-001');
          await fetch('/api/admin/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ passcode: pass })
          }).catch(() => {});
        }, passcode);
      }
    }
  ];

  for (const t of targets) {
    console.log(`\n📸 Capturing: ${t.name} from ${t.url} ...`);
    
    // Initial navigation
    await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    
    // Run setup if needed
    if (t.setup) {
      await t.setup(page, PASSCODE);
      await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    }

    if (t.action) {
      await t.action(page);
    }

    // Wait a brief moment for layout/animations/images to settle
    await new Promise(r => setTimeout(r, 1500));

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

    console.log(`  ✓ Viewport: ${overflowInfo.innerW}px, Document: ${overflowInfo.docW}px`);
    if (overflowInfo.culprits.length > 0) {
      console.warn(`  ⚠️ Overflows found in ${t.name}:`, overflowInfo.culprits);
    }

    const outPath = path.join(screenshotsDir, t.name);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`  ✅ Saved screenshot to ${outPath}`);
  }

  await browser.close();
  console.log('\n🎉 All screenshots updated successfully in public/screenshots/ !');
}

main().catch(err => {
  console.error('❌ Error capturing screenshots:', err);
  process.exit(1);
});
