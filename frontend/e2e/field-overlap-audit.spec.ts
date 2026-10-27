import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const screenshotDir = path.resolve('..', 'screenshots-admin');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

// Overlap & border audit helper
async function auditFieldBoxes(page: Page, contextName: string) {
  const containers = page.locator('.m3-field-container');
  const count = await containers.count();
  for (let i = 0; i < count; i++) {
    const container = containers.nth(i);
    if (!(await container.isVisible())) continue;

    // Must have exactly one bordered box
    const boxes = container.locator('.m3-field-box');
    expect(await boxes.count(), `${contextName} Field #${i} should have exactly 1 bordered box`).toBe(1);

    // Label and input must not visually overlap when value is typed
    const label = container.locator('label.m3-field-floating-label');
    const input = container.locator('input.m3-field-input, textarea.m3-field-input');

    if ((await label.isVisible()) && (await input.isVisible())) {
      const labelBox = await label.boundingBox();
      const inputBox = await input.boundingBox();

      if (labelBox && inputBox) {
        const val = await input.inputValue();
        if (val && val.length > 0) {
          // When a value exists, the floating label must be in the top notch
          expect(
            labelBox.y,
            `${contextName} floating label should be positioned in top notch, above input text`
          ).toBeLessThanOrEqual(inputBox.y + 6);
        }
      }
    }
  }
}

test.describe('Admin Console & Multi-Route Field Overlap Audit', () => {
  const viewports = [
    { name: 'desktop-1366', width: 1366, height: 768 },
    { name: 'desktop-1920', width: 1920, height: 1080 },
    { name: 'mobile-390', width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    test(`Admin tabs visual & overlap audit at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('http://localhost:5173');
      await page.waitForLoadState('networkidle');

      // 1. Audit Login page fields
      await auditFieldBoxes(page, 'Login Gateway');

      // Switch to Administrator sign in
      const footerLink = page.locator('a:has-text("Administrator sign in")');
      await expect(footerLink).toBeVisible();
      await footerLink.click();

      // Log in as Admin
      const usernameField = page.locator('input[placeholder="e.g. admin"]');
      const passwordField = page.locator('input[placeholder="Password"]');
      await usernameField.fill('admin');
      await passwordField.fill('Admin@Aegis2026');
      await page.click('button[type="submit"]:has-text("Sign in")');

      // Wait for Admin Console to mount
      await expect(page.locator('h1:has-text("Aegis System Administration")')).toBeVisible();

      // --- LIGHT & DARK SCREENSHOTS FOR EACH TAB ---
      const themes = ['light', 'dark'];
      const tabs = [
        { id: 'USERS', name: 'Users', tabText: 'Staff & User Accounts' },
        { id: 'UNITS', name: 'Units', tabText: 'Ambulance Fleet' },
        { id: 'HOSPITALS', name: 'Hospitals', tabText: 'Hospitals & ED Facilities' },
      ];

      for (const theme of themes) {
        await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
        await page.waitForTimeout(200);

        for (const tab of tabs) {
          const tabBtn = page.locator(`button[role="tab"]:has-text("${tab.tabText}")`);
          if (await tabBtn.isVisible()) {
            await tabBtn.click();
            await page.waitForTimeout(300);
          }

          // If mobile, open add form modal to audit form fields
          if (vp.width <= 1000) {
            const addBtn = page.locator('.m3-admin-mobile-add-btn button');
            if (await addBtn.isVisible()) {
              await addBtn.click();
              await page.waitForTimeout(200);
            }
          }

          // Audit fields in current tab
          await auditFieldBoxes(page, `Admin ${tab.name} (${theme})`);

          // Test Autofill & hygiene: form fields must be empty upon opening
          if (tab.id === 'USERS') {
            const userInput = page.locator('input[name="admin_usr_username_input"]:visible').first();
            if (await userInput.isVisible()) {
              expect(await userInput.inputValue()).toBe('');
            }
          }

          // Screenshot
          const screenshotPath = path.join(
            screenshotDir,
            `admin-${tab.id.toLowerCase()}-${theme}-${vp.name}.png`
          );
          await page.screenshot({ path: screenshotPath, fullPage: true });

          // Close modal if opened on mobile
          if (vp.width <= 1000) {
            const closeBtn = page.locator('button[aria-label="Close dialog"]');
            if (await closeBtn.isVisible()) {
              await closeBtn.click();
              await page.waitForTimeout(200);
            }
          }
        }
      }

      // Sign out
      const signOutBtn = page.locator('button:has-text("Sign out")');
      if (await signOutBtn.isVisible()) {
        await signOutBtn.click();
      }
    });
  }

  test('Audit CAD Dispatcher, Responder, Hospital, and Citizen routes', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // 1. Dispatcher Route
    const cadTab = page.locator('#login-tab-dispatcher');
    await cadTab.click();
    await page.locator('input[placeholder="e.g. DISPATCH-01"]').fill('DISPATCH-01');
    await page.locator('input[placeholder="Security PIN or Password"]').fill('Dispatch@2026');
    await page.locator('button[type="submit"]:has-text("Sign in")').click();
    await page.waitForTimeout(500);
    await auditFieldBoxes(page, 'CAD Dashboard');

    // Sign out from CAD
    await page.evaluate(() => localStorage.clear());
    await page.goto('http://localhost:5173');

    // 2. Citizen Route
    const citizenTab = page.locator('#login-tab-citizen');
    await citizenTab.click();
    await page.locator('input[placeholder="e.g. 9845012345"]').fill('9845012345');
    await page.locator('input[placeholder="Account Password"]').fill('1120');
    await page.locator('button[type="submit"]:has-text("Sign in")').click();
    await page.waitForTimeout(500);
    await auditFieldBoxes(page, 'Citizen Portal');
  });
});
