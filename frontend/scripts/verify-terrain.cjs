const { chromium } = require('playwright');
const path = require('path');

async function testTerrain() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // 1. Central CAD MapView: click layer menu button
  console.log('Testing Central CAD Layer menu...');
  const layerBtn = page.locator('button[aria-label="Select map layer style"]');
  if (await layerBtn.count() > 0) {
    await layerBtn.click();
    await page.waitForTimeout(500);

    // Click Topographic terrain
    const terrainItem = page.locator('button:has-text("Topographic terrain")');
    if (await terrainItem.count() > 0) {
      console.log('Clicking Topographic terrain in CAD...');
      await terrainItem.click();
      await page.waitForTimeout(2500); // wait for tiles to load
    }
  }

  const cadScreenshot = 'C:/Users/ASUS/.gemini/antigravity/brain/3dd51913-f670-4c72-8a2f-c4f9e9f6b0d2/verified-cad-terrain-map.png';
  await page.screenshot({ path: cadScreenshot });
  console.log('Saved CAD terrain screenshot to:', cadScreenshot);

  // 2. Look for Responder / Ambulance Console navigation
  console.log('Looking for role switch or tab buttons...');
  const buttons = await page.locator('button, nav a').allInnerTexts();
  console.log('Buttons/links available:', buttons.filter(b => b.trim().length > 0));

  // Try clicking role switcher if available or Responder tab
  const responderBtn = page.locator('button:has-text("Responder"), button:has-text("Driver"), button:has-text("Ambulance"), [data-testid="role-responder"]');
  if (await responderBtn.count() > 0) {
    console.log('Found responder switcher, clicking...');
    await responderBtn.first().click();
    await page.waitForTimeout(1500);
  }

  // Look for "Terrain" button in AmbulanceRouteMap
  const terrainBtn = page.locator('.amb-style-btn:has-text("Terrain")');
  console.log('Terrain buttons count:', await terrainBtn.count());
  if (await terrainBtn.count() > 0) {
    console.log('Clicking Terrain button in AmbulanceRouteMap...');
    await terrainBtn.first().click();
    await page.waitForTimeout(2500);
  }

  const responderScreenshot = 'C:/Users/ASUS/.gemini/antigravity/brain/3dd51913-f670-4c72-8a2f-c4f9e9f6b0d2/verified-responder-terrain-map.png';
  await page.screenshot({ path: responderScreenshot });
  console.log('Saved Responder terrain screenshot to:', responderScreenshot);

  await browser.close();
}

testTerrain().catch(err => {
  console.error('Error running test:', err);
  process.exit(1);
});
