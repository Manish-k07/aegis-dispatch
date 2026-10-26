const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const viewports = [
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '390x844', width: 390, height: 844, isMobile: true }
];

async function capture() {
  const outputDir = path.join(__dirname, '..', 'screenshots', 'step5');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await chromium.launch();

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile || false
    });
    const page = await context.newPage();

    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

    // Set Hospital session in localStorage
    await page.evaluate(() => {
      localStorage.setItem('aegis_auth_session', JSON.stringify({
        role: 'HOSPITAL',
        userLabel: 'Demo City Hospital',
        hospitalId: 'hosp-1'
      }));
      // Set light theme for hospital
      localStorage.setItem('aegis_theme_preference', 'light');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const hospPath = path.join(outputDir, `hospital-${vp.name}.png`);
    await page.screenshot({ path: hospPath, fullPage: true });
    console.log(`Saved screenshot: ${hospPath}`);

    await context.close();
  }

  await browser.close();
  console.log('Step 5 screenshots captured successfully.');
}

capture().catch((err) => {
  console.error('Screenshot error:', err);
  process.exit(1);
});
