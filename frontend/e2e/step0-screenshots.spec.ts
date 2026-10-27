import { test } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const VIEWPORTS = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '390x844', width: 390, height: 844 },
  { name: '320x640', width: 320, height: 640 },
];

const THEMES = ['light', 'dark'] as const;

const ROLES = [
  { id: 'DISPATCHER', tabText: 'CAD Dispatch' },
  { id: 'DRIVER', tabText: 'Responder (MDT)' },
  { id: 'HOSPITAL', tabText: 'Hospital ED' },
  { id: 'CITIZEN', tabText: 'Citizen SOS' },
  { id: 'ADMIN', tabText: 'System Admin' },
];

test('Capture Step 0 baseline screenshots', async ({ page }) => {
  const outDir = path.resolve(process.cwd(), 'screenshots-step0');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });

    for (const theme of THEMES) {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Set theme
      await page.evaluate((th) => {
        document.documentElement.setAttribute('data-theme', th);
        localStorage.setItem('aegis_theme_preference', th);
      }, theme);

      for (const role of ROLES) {
        // Click role tab
        const tabBtn = page.locator(`button:has-text("${role.tabText}")`).first();
        if (await tabBtn.isVisible()) {
          await tabBtn.click();
          await page.waitForTimeout(100);
        }

        const filename = `step0-${role.id.toLowerCase()}-${theme}-${vp.name}.png`;
        await page.screenshot({ path: path.join(outDir, filename), fullPage: false });
      }
    }
  }
});
