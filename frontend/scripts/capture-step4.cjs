const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const viewports = [
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '390x844', width: 390, height: 844, isMobile: true }
];

async function capture() {
  const outputDir = path.join(__dirname, '..', 'screenshots', 'step4');
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

    // Set Driver session in localStorage
    await page.evaluate(() => {
      localStorage.setItem('aegis_auth_session', JSON.stringify({
        role: 'DRIVER',
        userLabel: 'Arun Kumar (Paramedic)',
        ambulanceId: 'amb-1'
      }));
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const mdtPath = path.join(outputDir, `mdt-${vp.name}.png`);
    await page.screenshot({ path: mdtPath, fullPage: true });
    console.log(`Saved screenshot: ${mdtPath}`);

    await context.close();
  }

  await browser.close();
  console.log('Step 4 screenshots captured successfully.');
}

capture().catch((err) => {
  console.error('Screenshot error:', err);
  process.exit(1);
});
