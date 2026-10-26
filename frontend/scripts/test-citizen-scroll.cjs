const { chromium } = require('@playwright/test');

async function testScroll() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true
  });
  const page = await context.newPage();
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.setItem('aegis_auth_session', JSON.stringify({
      role: 'CITIZEN',
      userLabel: 'Priya Sharma',
      citizenProfile: {
        name: 'Priya Sharma',
        phone: '+91 98450 12345',
        age: 29,
        gender: 'FEMALE',
        bloodGroup: 'O+',
        diseases: ['Severe asthma'],
        allergies: ['Penicillin / amoxicillin'],
        emergencyContactName: 'Amit Patel (Spouse)',
        emergencyContactPhone: '+91 98450 99887'
      }
    }));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  const scrollInfo = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(doc.scrollWidth, body.scrollWidth);
    const clientWidth = Math.max(doc.clientWidth, body.clientWidth);
    return {
      scrollWidth,
      clientWidth,
      hasOverflow: scrollWidth > clientWidth + 1
    };
  });

  console.log('Scroll Info:', scrollInfo);
  await browser.close();
}

testScroll();