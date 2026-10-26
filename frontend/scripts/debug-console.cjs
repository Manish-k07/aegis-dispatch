const { chromium } = require('@playwright/test');

async function debug() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR:', msg.text());
    }
  });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await browser.close();
}

debug();