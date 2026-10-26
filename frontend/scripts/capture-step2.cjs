const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const viewports = [
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '390x844', width: 390, height: 844, isMobile: true }
];

async function capture() {
  const outputDir = path.join(__dirname, '..', 'screenshots', 'step2');
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
    
    // Navigate to login
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    
    // Ensure we are on login screen (sign out or clear localStorage if needed)
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload({ waitUntil: 'networkidle' });

    // Wait a brief moment for fonts and rendering
    await page.waitForTimeout(500);

    const screenshotPath = path.join(outputDir, `login-${vp.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Saved screenshot: ${screenshotPath}`);

    // Also capture responder tab with custom select
    const responderBtn = page.locator('button:has-text("Responder")');
    if (await responderBtn.count() > 0) {
      await responderBtn.click();
      await page.waitForTimeout(300);
      const responderPath = path.join(outputDir, `login-responder-${vp.name}.png`);
      await page.screenshot({ path: responderPath, fullPage: true });
      console.log(`Saved screenshot: ${responderPath}`);
    }

    await context.close();
  }

  await browser.close();
  console.log('Step 2 screenshots captured successfully.');
}

capture().catch(err => {
  console.error('Screenshot error:', err);
  process.exit(1);
});
