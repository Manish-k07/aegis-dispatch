const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const viewports = [
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '390x844', width: 390, height: 844, isMobile: true }
];

async function capture() {
  const outputDir = path.join(__dirname, '..', 'screenshots', 'step3');
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

    // Set Dispatcher session in localStorage
    await page.evaluate(() => {
      localStorage.setItem('aegis_auth_session', JSON.stringify({
        role: 'DISPATCHER',
        userLabel: 'Alex Rivera (Chief Dispatcher)',
        subLabel: 'Central Communications Hub'
      }));
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const cadPath = path.join(outputDir, `cad-${vp.name}.png`);
    await page.screenshot({ path: cadPath, fullPage: true });
    console.log(`Saved screenshot: ${cadPath}`);

    // If 1366x768, also capture user menu and overflow menu opened
    if (vp.name === '1366x768') {
      const userBtn = page.locator('button[aria-label="User account menu"]');
      if (await userBtn.count() > 0) {
        await userBtn.click();
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(outputDir, 'cad-user-menu.png') });
        await userBtn.click(); // close
        await page.waitForTimeout(200);
      }

      const overflowBtn = page.locator('button[aria-label="More options"]');
      if (await overflowBtn.count() > 0) {
        await overflowBtn.click();
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(outputDir, 'cad-overflow-menu.png') });
      }
    }

    await context.close();
  }

  await browser.close();
  console.log('Step 3 screenshots captured successfully.');
}

capture().catch((err) => {
  console.error('Screenshot error:', err);
  process.exit(1);
});
