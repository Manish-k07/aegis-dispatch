const { chromium } = require("c:/Users/ASUS/OneDrive/Desktop/desktop-folder's/mp/aegis-dispatch/frontend/node_modules/playwright");
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  // Open demo credentials and fill Paramedic
  const demoBtn = page.locator('button:has-text("Demo Credentials")');
  if (await demoBtn.isVisible()) {
    await demoBtn.click();
    await page.waitForTimeout(400);
    await page.locator('button:has-text("Fill Paramedic")').click();
    await page.waitForTimeout(300);
    await page.locator('button:has-text("Sign in to MDT")').click();
    await page.waitForTimeout(1500);
  }

  // Modal: Select Driver mode
  const driverBtn = page.getByRole('button', { name: 'Launch Driver View' });
  if (await driverBtn.isVisible()) {
    await driverBtn.click();
    await page.waitForTimeout(2000);
  }

  // 1. Street
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(__dirname, 'style-street.png'), fullPage: false });
  console.log('Saved style-street.png');

  // 2. Click Dark and wait 4s
  const darkBtn = page.locator('button.amb-style-btn:has-text("Dark")').first();
  if (await darkBtn.isVisible()) {
    await darkBtn.click();
    console.log('Clicked Dark, waiting 4s for tiles...');
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(__dirname, 'style-dark.png'), fullPage: false });
    console.log('Saved style-dark.png');
  }

  // 3. Click Sat and wait 4s
  const satBtn = page.locator('button.amb-style-btn:has-text("Sat")').first();
  if (await satBtn.isVisible()) {
    await satBtn.click();
    console.log('Clicked Sat, waiting 4s for tiles...');
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(__dirname, 'style-sat.png'), fullPage: false });
    console.log('Saved style-sat.png');
  }

  await browser.close();
  console.log('Finished testing styles!');
})();
