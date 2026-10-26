const { chromium } = require("c:/Users/ASUS/OneDrive/Desktop/desktop-folder's/mp/aegis-dispatch/frontend/node_modules/playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const logs = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      logs.push(`[CONSOLE ERROR] ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    logs.push(`[PAGE ERROR] ${err.message}`);
  });

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  // Sign in to paramedic
  const demoBtn = page.locator('button:has-text("Demo Credentials")');
  if (await demoBtn.isVisible()) {
    await demoBtn.click();
    await page.waitForTimeout(400);
    await page.locator('button:has-text("Fill Paramedic")').click();
    await page.waitForTimeout(300);
    await page.locator('button:has-text("Sign in to MDT")').click();
    await page.waitForTimeout(1500);
  }

  // Driver View
  const driverBtn = page.getByRole('button', { name: 'Launch Driver View' });
  if (await driverBtn.isVisible()) {
    await driverBtn.click();
    await page.waitForTimeout(2000);
  }

  console.log('Driver view errors:', logs.length ? logs : 'ZERO ERRORS');

  // Test map styles in Driver View
  const styles = ['Dark', 'Sat', 'Street'];
  for (const s of styles) {
    const btn = page.locator(`button.amb-style-btn:has-text("${s}")`).first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(1000);
    }
  }

  // Switch to Operator View
  const opBtn = page.getByRole('button', { name: 'Operator (Full)' });
  if (await opBtn.isVisible()) {
    await opBtn.click();
    await page.waitForTimeout(1500);
  }

  console.log('Operator view errors:', logs.length ? logs : 'ZERO ERRORS');

  // Also test 8080
  console.log('\n--- Testing port 8080 ---');
  const page8080 = await browser.newPage();
  const logs8080 = [];
  page8080.on('console', msg => {
    if (msg.type() === 'error') logs8080.push(`[8080 ERROR] ${msg.text()}`);
  });
  page8080.on('pageerror', err => {
    logs8080.push(`[8080 PAGE ERROR] ${err.message}`);
  });
  await page8080.goto('http://localhost:8080/', { waitUntil: 'networkidle' });
  console.log('Port 8080 errors:', logs8080.length ? logs8080 : 'ZERO ERRORS');

  await browser.close();
})();
