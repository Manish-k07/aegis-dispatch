const { chromium } = require('@playwright/test');

async function findOverflow() {
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

  const overflowingElements = await page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    const elements = Array.from(document.querySelectorAll('*'));
    const results = [];
    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      if (rect.right > docWidth + 1 || el.scrollWidth > docWidth + 1) {
        results.push({
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          rectRight: rect.right,
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          text: (el.textContent || '').trim().slice(0, 50)
        });
      }
    }
    return results;
  });

  console.log('Overflowing elements count:', overflowingElements.length);
  console.log(JSON.stringify(overflowingElements.slice(0, 10), null, 2));

  await browser.close();
}

findOverflow();