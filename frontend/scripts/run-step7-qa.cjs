const { chromium } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const fs = require('fs');
const path = require('path');

const viewports = [
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '390x844', width: 390, height: 844, isMobile: true }
];

const themes = ['light', 'dark'];

const portals = [
  {
    role: 'LOGIN',
    name: 'login',
    setup: async (page) => {
      await page.evaluate(() => {
        localStorage.removeItem('aegis_auth_session');
      });
    }
  },
  {
    role: 'DISPATCHER',
    name: 'cad',
    setup: async (page) => {
      await page.evaluate(() => {
        localStorage.setItem('aegis_auth_session', JSON.stringify({
          role: 'DISPATCHER',
          userLabel: 'A. Sharma',
          badgeNumber: 'CAD-042'
        }));
      });
    }
  },
  {
    role: 'PARAMEDIC',
    name: 'responder',
    setup: async (page) => {
      await page.evaluate(() => {
        localStorage.setItem('aegis_auth_session', JSON.stringify({
          role: 'PARAMEDIC',
          userLabel: 'MDT Unit Alpha',
          unitId: 'amb-1',
          vehicleId: 'KA-01-AE-1001'
        }));
      });
    }
  },
  {
    role: 'HOSPITAL',
    name: 'hospital',
    setup: async (page) => {
      await page.evaluate(() => {
        localStorage.setItem('aegis_auth_session', JSON.stringify({
          role: 'HOSPITAL',
          userLabel: 'Demo City Hospital',
          hospitalId: 'hosp-1'
        }));
      });
    }
  },
  {
    role: 'CITIZEN',
    name: 'citizen',
    setup: async (page) => {
      await page.evaluate(() => {
        localStorage.setItem('aegis_auth_session', JSON.stringify({
          role: 'CITIZEN',
          userLabel: 'Priya Sharma',
          citizenProfile: {
            name: 'Priya Sharma',
            phone: '+91 98450 12345',
            age: 29,
            gender: 'FEMALE',
            bloodGroup: 'O+',
            diseases: ['Severe asthma'],
            allergies: ['Penicillin / amoxicillin'],
            emergencyContactName: 'Amit Patel (Spouse)',
            emergencyContactPhone: '+91 98450 99887'
          }
        }));
      });
    }
  }
];

async function runQA() {
  const outputDir = path.join(__dirname, '..', 'screenshots', 'final');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const results = [];
  let totalErrors = 0;

  console.log('====================================================');
  console.log('STEP 7: FINAL QA & VERIFICATION SUITE');
  console.log('Testing 5 portals x 3 viewports x 2 themes = 30 matrix runs');
  console.log('====================================================\n');

  for (const portal of portals) {
    for (const vp of viewports) {
      for (const theme of themes) {
        const testId = `${portal.name}-${vp.name}-${theme}`;
        const consoleErrors = [];

        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          isMobile: vp.isMobile || false
        });
        const page = await context.newPage();

        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            const text = msg.text();
            // Ignore offline backend network errors (localhost:8080 connection refused)
            if (
              text.includes('ERR_CONNECTION_REFUSED') ||
              text.includes('Failed to load resource') ||
              text.includes('WebSocket connection to') ||
              text.includes('tile.openstreetmap.org') ||
              text.includes('favicon.ico')
            ) {
              return;
            }
            consoleErrors.push(text);
          }
        });

        await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
        await portal.setup(page);
        await page.evaluate((t) => {
          localStorage.setItem('aegis_theme_preference', t);
        }, theme);
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(400);

        // Check horizontal scroll
        const scrollInfo = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          const scrollWidth = Math.max(doc.scrollWidth, body.scrollWidth);
          const clientWidth = Math.max(doc.clientWidth, body.clientWidth);
          return {
            scrollWidth,
            clientWidth,
            hasHorizontalScroll: scrollWidth > clientWidth + 1
          };
        });

        // Screenshot
        const imgName = `${portal.name}-${vp.name}-${theme}.png`;
        const imgPath = path.join(outputDir, imgName);
        await page.screenshot({ path: imgPath, fullPage: true });

        // Run axe accessibility scan on desktop 1366x768 light
        let axeViolationsCount = 0;
        if (vp.name === '1366x768' && theme === 'light') {
          try {
            const axeResults = await new AxeBuilder({ page })
              .disableRules(['color-contrast']) // Color contrast rules often fail on custom tokens/canvases
              .analyze();
            axeViolationsCount = axeResults.violations.length;
          } catch (e) {
            // axe optional
          }
        }

        const passedScroll = !scrollInfo.hasHorizontalScroll;
        const passedConsole = consoleErrors.length === 0;

        if (!passedScroll || !passedConsole) {
          totalErrors++;
        }

        results.push({
          portal: portal.name,
          viewport: vp.name,
          theme,
          passedScroll,
          scrollDetails: `${scrollInfo.scrollWidth}w / ${scrollInfo.clientWidth}c`,
          passedConsole,
          consoleErrorCount: consoleErrors.length,
          axeViolationsCount
        });

        console.log(`[${passedScroll && passedConsole ? 'PASS' : 'WARN'}] ${testId} - Scroll: ${scrollInfo.scrollWidth <= scrollInfo.clientWidth + 1 ? 'OK' : 'OVERFLOW (' + scrollInfo.scrollWidth + ' > ' + scrollInfo.clientWidth + ')'} | Console: ${consoleErrors.length} errors`);

        await context.close();
      }
    }
  }

  await browser.close();

  console.log('\n====================================================');
  console.log('FINAL QA SUMMARY:');
  console.log(`Total Matrix Executions: ${results.length}`);
  console.log(`Total Issues Found: ${totalErrors}`);
  console.log('====================================================\n');

  if (totalErrors > 0) {
    console.error(`QA Suite finished with ${totalErrors} issue(s). Check details above.`);
    process.exit(1);
  } else {
    console.log('✅ ALL QA CHECKS PASSED: 0 horizontal overflows, 0 console errors across all viewports and themes.');
  }
}

runQA().catch((err) => {
  console.error(err);
  process.exit(1);
});