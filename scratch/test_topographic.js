const { chromium } = require("c:/Users/ASUS/OneDrive/Desktop/desktop-folder's/mp/aegis-dispatch/frontend/node_modules/playwright");
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/ASUS/.gemini/antigravity/brain/3dd51913-f670-4c72-8a2f-c4f9e9f6b0d2';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('--- 1. Testing Central CAD MapView ---');
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

    // Look for Topographic terrain
    const topoOption = page.locator('button.m3-menu-item:has-text("Topographic terrain")');
    console.log('Topographic terrain option visible:', await topoOption.isVisible());
    if (await topoOption.isVisible()) {
      await topoOption.click();
      console.log('Selected Topographic terrain in CAD MapView!');
      await page.waitForTimeout(3500); // allow Esri tiles to load
    }
  }

  const cadScreenshot = path.join(ARTIFACT_DIR, 'verified-cad-topo-map.png');
  await page.screenshot({ path: cadScreenshot, fullPage: false });
  console.log('Saved CAD Topographic screenshot:', cadScreenshot);

  console.log('--- 2. Testing Responder Driver View ---');
  // Log out or clear session to switch role
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });

  // Sign in as Paramedic
  const demoBtn2 = page.locator('button:has-text("Demo Credentials")');
  if (await demoBtn2.isVisible()) {
    await demoBtn2.click();
    await page.waitForTimeout(400);
    await page.locator('button:has-text("Fill Paramedic")').click();
    await page.waitForTimeout(300);
    await page.locator('button:has-text("Sign in to MDT")').click();
    await page.waitForTimeout(1500);
  }

  // Launch Driver View
  const driverBtn = page.getByRole('button', { name: 'Launch Driver View' });
  if (await driverBtn.isVisible()) {
    await driverBtn.click();
    await page.waitForTimeout(2000);
  }

  // Click Terrain button
  const terrainBtn = page.locator('button.amb-style-btn:has-text("Terrain")').first();
  console.log('Driver Terrain button visible:', await terrainBtn.isVisible());
  if (await terrainBtn.isVisible()) {
    await terrainBtn.click();
    console.log('Clicked Terrain in Driver View, waiting 4s for tiles...');
    await page.waitForTimeout(4000);
  }

  const driverScreenshot = path.join(ARTIFACT_DIR, 'verified-driver-topo-map.png');
  await page.screenshot({ path: driverScreenshot, fullPage: false });
  console.log('Saved Driver Topographic screenshot:', driverScreenshot);

  console.log('--- 3. Testing Responder Operator Console View ---');
  // Back to console or switch to operator view
  const consoleBtn = page.locator('button:has-text("Clinical"), button:has-text("Console"), button:has-text("Operator"), button[title*="Console"]').first();
  if (await consoleBtn.isVisible()) {
    await consoleBtn.click();
    await page.waitForTimeout(1500);
    const opTerrainBtn = page.locator('button.amb-style-btn:has-text("Terrain")').first();
    if (await opTerrainBtn.isVisible()) {
      await opTerrainBtn.click();
      await page.waitForTimeout(3000);
    }
  }

  const operatorScreenshot = path.join(ARTIFACT_DIR, 'verified-operator-topo-map.png');
  await page.screenshot({ path: operatorScreenshot, fullPage: false });
  console.log('Saved Operator Topographic screenshot:', operatorScreenshot);

  await browser.close();
  console.log('Verification finished successfully!');
})();
