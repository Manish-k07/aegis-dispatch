const { chromium } = require("c:/Users/ASUS/OneDrive/Desktop/desktop-folder's/mp/aegis-dispatch/frontend/node_modules/playwright");
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  // Sign in as Dispatcher
  const demoBtn = page.locator('button:has-text("Demo Credentials")');
  if (await demoBtn.isVisible()) {
    await demoBtn.click();
    await page.waitForTimeout(400);
    await page.locator('button:has-text("Fill Dispatcher")').click();
    await page.waitForTimeout(300);
    await page.locator('button:has-text("Sign in to CAD")').click();
    await page.waitForTimeout(2000);
  }

  // Open layer menu
  const layerMenuBtn = page.locator('button[aria-label="Change map layer"]').first();
  if (await layerMenuBtn.isVisible()) {
    await layerMenuBtn.click();
    await page.waitForTimeout(500);
    
    // Check for "Dark tactical map"
    const darkOption = page.locator('button.m3-menu-item:has-text("Dark tactical map")');
    console.log('Dark tactical map option found:', await darkOption.isVisible());
    if (await darkOption.isVisible()) {
      await darkOption.click();
      console.log('Selected Dark tactical map in CAD MapView!');
      await page.waitForTimeout(3000);
    }
  }

  const ssPath = path.join(__dirname, 'verified-cad-dark-map.png');
  await page.screenshot({ path: ssPath, fullPage: false });
  console.log('Saved screenshot:', ssPath);

  await browser.close();
})();
