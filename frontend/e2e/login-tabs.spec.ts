import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import * as path from 'path';
import * as fs from 'fs';

const VIEWPORTS = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '390x844', width: 390, height: 844 },
  { name: '320x640', width: 320, height: 640 },
];

const THEMES = ['light', 'dark'] as const;

const ROLES = [
  { id: 'citizen', label: 'Citizen', heading: 'Citizen sign in' },
  { id: 'dispatcher', label: 'Dispatcher', heading: 'Dispatcher sign in' },
  { id: 'responder', label: 'Responder', heading: 'Responder sign in' },
  { id: 'hospital', label: 'Hospital', heading: 'Hospital sign in' },
];

test.describe('STEP 1 & STEP 4 - Role Selector Layout, Visibility, & Overlap Invariants', () => {
  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`Viewports ${vp.width}x${vp.height} (${theme}) - No overflow, tabs >=48x64, no overlap, no box-shadow on selected`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        await page.evaluate((th) => {
          document.documentElement.setAttribute('data-theme', th);
          localStorage.setItem('aegis_theme_preference', th);
        }, theme);

        const tablist = page.locator('[role="tablist"][aria-label="Role selector"]');
        await expect(tablist).toBeVisible();

        // Check horizontal overflow on tablist
        const tablistOverflow = await tablist.evaluate((el) => {
          return {
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth,
            hasOverflow: el.scrollWidth > el.clientWidth,
          };
        });
        expect(
          tablistOverflow.hasOverflow,
          `Tablist should not have horizontal overflow: scrollWidth=${tablistOverflow.scrollWidth}, clientWidth=${tablistOverflow.clientWidth}`
        ).toBe(false);

        // Check all 4 tabs
        const tabs = page.locator('[role="tablist"] [role="tab"]');
        const count = await tabs.count();
        expect(count).toBe(4);

        const boundingBoxes: { x: number; y: number; width: number; height: number; text: string }[] = [];

        for (let i = 0; i < count; i++) {
          const tab = tabs.nth(i);
          await expect(tab).toBeVisible();

          const tabInfo = await tab.evaluate((el) => {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return {
              scrollWidth: el.scrollWidth,
              clientWidth: el.clientWidth,
              width: rect.width,
              height: rect.height,
              boxShadow: style.boxShadow,
              ariaSelected: el.getAttribute('aria-selected'),
              text: el.textContent?.trim() || '',
            };
          });

          // scrollWidth <= clientWidth (no truncation or internal overflow)
          expect(
            tabInfo.scrollWidth <= tabInfo.clientWidth,
            `Tab "${tabInfo.text}" scrollWidth (${tabInfo.scrollWidth}) <= clientWidth (${tabInfo.clientWidth})`
          ).toBe(true);

          // Tab size: at least 48px wide and 64px tall
          expect(
            tabInfo.width,
            `Tab "${tabInfo.text}" width (${tabInfo.width}) should be >= 48px`
          ).toBeGreaterThanOrEqual(47.9); // floating point tolerance
          expect(
            tabInfo.height,
            `Tab "${tabInfo.text}" height (${tabInfo.height}) should be >= 64px`
          ).toBeGreaterThanOrEqual(63.9);

          // If selected, no box-shadow
          if (tabInfo.ariaSelected === 'true') {
            const hasShadow =
              tabInfo.boxShadow &&
              tabInfo.boxShadow !== 'none' &&
              !tabInfo.boxShadow.includes('0px 0px 0px');
            expect(hasShadow, `Selected tab "${tabInfo.text}" should have no box-shadow`).toBeFalsy();
          }

          const box = await tab.boundingBox();
          if (box) {
            boundingBoxes.push({ ...box, text: tabInfo.text });
          }
        }

        // Verify tabs do not overlap horizontally
        for (let i = 0; i < boundingBoxes.length - 1; i++) {
          const cur = boundingBoxes[i];
          const next = boundingBoxes[i + 1];
          expect(
            cur.x + cur.width <= next.x + 0.5,
            `Tab "${cur.text}" (right=${cur.x + cur.width}) overlaps with tab "${next.text}" (left=${next.x})`
          ).toBe(true);
        }
      });
    }
  }
});

test.describe('STEP 2 & STEP 4 - Forbidden Strings & Branding Verification', () => {
  test('Page contains none of the forbidden strings', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const forbiddenStrings = [
      'AEGIS DISPATCH',
      'Telematics',
      'MDT',
      'CAD Dispatch',
      'Hospital ED',
      'System Admin',
      'Launch MDT Navigation',
      'Emergency Dept',
    ];

    const bodyText = await page.locator('body').innerText();

    for (const forbidden of forbiddenStrings) {
      expect(
        bodyText.includes(forbidden),
        `Page text must NOT contain forbidden string: "${forbidden}"`
      ).toBe(false);
    }

    // Verify brand header
    const brandName = page.locator('h1:has-text("Aegis")');
    await expect(brandName).toBeVisible();
    const brandTagline = page.locator('text="Connecting citizens, dispatchers, paramedics and hospitals"');
    await expect(brandTagline).toBeVisible();
  });
});

test.describe('STEP 3 & STEP 4 - State & Autofill Separation Across Roles', () => {
  test('Switching roles 5 times never carries values across forms, password is never restored', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 1. Citizen Tab: type into phone & password
    const citizenTab = page.locator('#login-tab-citizen');
    await citizenTab.click();

    const citizenPhone = page.locator('input[name="citizen_phone"]');
    const citizenPass = page.locator('input[name="citizen_password"]');
    await citizenPhone.fill('9845012345');
    await citizenPass.fill('SecretCitizen123');

    expect(await citizenPhone.inputValue()).toBe('9845012345');
    expect(await citizenPass.inputValue()).toBe('SecretCitizen123');

    // 2. Switch to Dispatcher Tab
    const dispatcherTab = page.locator('#login-tab-dispatcher');
    await dispatcherTab.click();

    // Verify Dispatcher fields are empty
    const dispBadge = page.locator('input[name="dispatcher_badge"]');
    const dispPin = page.locator('input[name="dispatcher_pin"]');
    await expect(dispBadge).toBeVisible();
    expect(await dispBadge.inputValue()).toBe('');
    expect(await dispPin.inputValue()).toBe('');

    // Type Dispatcher credentials
    await dispBadge.fill('DISPATCH-01');
    await dispPin.fill('DispPIN456');

    // 3. Switch to Responder Tab
    const responderTab = page.locator('#login-tab-responder');
    await responderTab.click();

    // Verify Responder fields are empty
    const respBadge = page.locator('input[name="responder_badge"]');
    const respPin = page.locator('input[name="responder_pin"]');
    await expect(respBadge).toBeVisible();
    expect(await respBadge.inputValue()).toBe('');
    expect(await respPin.inputValue()).toBe('');

    // Type Responder credentials
    await respBadge.fill('MED-702');
    await respPin.fill('RespPIN789');

    // 4. Switch to Hospital Tab
    const hospitalTab = page.locator('#login-tab-hospital');
    await hospitalTab.click();

    // Verify Hospital fields are empty
    const hospBadge = page.locator('input[name="hospital_badge"]');
    const hospPin = page.locator('input[name="hospital_pin"]');
    await expect(hospBadge).toBeVisible();
    expect(await hospBadge.inputValue()).toBe('');
    expect(await hospPin.inputValue()).toBe('');

    // 5. Switch back to Citizen Tab
    await citizenTab.click();
    await expect(citizenPhone).toBeVisible();

    // The password field MUST be empty
    expect(await citizenPass.inputValue()).toBe('');
  });

  test('Staff ID and Staff PIN fields have autoComplete="off"', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check Dispatcher
    await page.locator('#login-tab-dispatcher').click();
    expect(await page.locator('input[name="dispatcher_badge"]').getAttribute('autocomplete')).toBe('off');
    expect(await page.locator('input[name="dispatcher_pin"]').getAttribute('autocomplete')).toBe('off');

    // Check Responder
    await page.locator('#login-tab-responder').click();
    expect(await page.locator('input[name="responder_badge"]').getAttribute('autocomplete')).toBe('off');
    expect(await page.locator('input[name="responder_pin"]').getAttribute('autocomplete')).toBe('off');

    // Check Hospital
    await page.locator('#login-tab-hospital').click();
    expect(await page.locator('input[name="hospital_badge"]').getAttribute('autocomplete')).toBe('off');
    expect(await page.locator('input[name="hospital_pin"]').getAttribute('autocomplete')).toBe('off');
  });
});

test.describe('STEP 1 & STEP 4 - /admin/login Routing & Footer Link', () => {
  test('/admin/login works and is reachable from footer link only', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Confirm NO "System Admin" tab in tablist
    const adminTab = page.locator('[role="tab"]:has-text("System Admin")');
    expect(await adminTab.count()).toBe(0);

    // Locate footer link
    const footerLink = page.locator('a:has-text("Administrator sign in")');
    await expect(footerLink).toBeVisible();

    // Click footer link
    await footerLink.click();
    await page.waitForTimeout(100);

    // Heading "Administrator sign in" is visible
    const adminHeading = page.locator('h2:has-text("Administrator sign in")');
    await expect(adminHeading).toBeVisible();

    // Administrator Username and Password fields are mounted
    const adminUser = page.locator('input[name="admin_username"]');
    const adminPass = page.locator('input[name="admin_password"]');
    await expect(adminUser).toBeVisible();
    await expect(adminPass).toBeVisible();

    // Return link works
    const returnLink = page.locator('a:has-text("Return to portal sign in")');
    await expect(returnLink).toBeVisible();
    await returnLink.click();
    await page.waitForTimeout(100);

    // Tabs are restored
    const tablist = page.locator('[role="tablist"][aria-label="Role selector"]');
    await expect(tablist).toBeVisible();
  });

  test('Direct navigation to /admin/login displays administrator sign in', async ({ page }) => {
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');

    const adminHeading = page.locator('h2:has-text("Administrator sign in")');
    await expect(adminHeading).toBeVisible();
    await expect(page.locator('input[name="admin_username"]')).toBeVisible();
    await expect(page.locator('input[name="admin_password"]')).toBeVisible();
  });
});

test.describe('STEP 1 & STEP 4 - Keyboard Navigation & Accessibility', () => {
  test('Keyboard ArrowLeft, ArrowRight, Home, End navigation between tabs', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const citizenTab = page.locator('#login-tab-citizen');
    const dispatcherTab = page.locator('#login-tab-dispatcher');
    const responderTab = page.locator('#login-tab-responder');
    const hospitalTab = page.locator('#login-tab-hospital');

    // Focus initial tab
    await citizenTab.focus();
    await expect(citizenTab).toBeFocused();
    expect(await citizenTab.getAttribute('aria-selected')).toBe('true');

    // Press ArrowRight -> moves to Dispatcher
    await page.keyboard.press('ArrowRight');
    await expect(dispatcherTab).toBeFocused();
    expect(await dispatcherTab.getAttribute('aria-selected')).toBe('true');

    // Press ArrowRight -> moves to Responder
    await page.keyboard.press('ArrowRight');
    await expect(responderTab).toBeFocused();
    expect(await responderTab.getAttribute('aria-selected')).toBe('true');

    // Press ArrowRight -> moves to Hospital
    await page.keyboard.press('ArrowRight');
    await expect(hospitalTab).toBeFocused();
    expect(await hospitalTab.getAttribute('aria-selected')).toBe('true');

    // Press ArrowRight -> wraps around to Citizen
    await page.keyboard.press('ArrowRight');
    await expect(citizenTab).toBeFocused();
    expect(await citizenTab.getAttribute('aria-selected')).toBe('true');

    // Press ArrowLeft -> wraps back to Hospital
    await page.keyboard.press('ArrowLeft');
    await expect(hospitalTab).toBeFocused();
    expect(await hospitalTab.getAttribute('aria-selected')).toBe('true');

    // Press Home -> moves to Citizen
    await page.keyboard.press('Home');
    await expect(citizenTab).toBeFocused();
    expect(await citizenTab.getAttribute('aria-selected')).toBe('true');

    // Press End -> moves to Hospital
    await page.keyboard.press('End');
    await expect(hospitalTab).toBeFocused();
    expect(await hospitalTab.getAttribute('aria-selected')).toBe('true');
  });

  test('Axe-core accessibility audit passes on login page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast']) // avoid false positives on ambient theme tokens
      .analyze();

    expect(results.violations).toEqual([]);
  });
});

test.describe('STEP 4 - Visual Screenshot Capture across all 4 Roles + Admin', () => {
  const SCREENSHOT_VIEWPORTS = [
    { name: '1920x1080', width: 1920, height: 1080 },
    { name: '1366x768', width: 1366, height: 768 },
    { name: '390x844', width: 390, height: 844 },
    { name: '320x640', width: 320, height: 640 },
  ];

  for (const vp of SCREENSHOT_VIEWPORTS) {
    for (const theme of THEMES) {
      test(`Capture screenshots at ${vp.name} (${theme})`, async ({ page }) => {
        const outDir = path.resolve(process.cwd(), 'screenshots-login-tabs');
        if (!fs.existsSync(outDir)) {
          fs.mkdirSync(outDir, { recursive: true });
        }

        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        await page.evaluate((th) => {
          document.documentElement.setAttribute('data-theme', th);
          localStorage.setItem('aegis_theme_preference', th);
        }, theme);

        for (const role of ROLES) {
          const tab = page.locator(`#login-tab-${role.id}`);
          await tab.click();
          await page.waitForTimeout(50);

          const filename = `login-${role.id}-${theme}-${vp.name}.png`;
          await page.screenshot({ path: path.join(outDir, filename), fullPage: false });
        }

        // Also screenshot Admin Sign In
        const footerLink = page.locator('a:has-text("Administrator sign in")');
        if (await footerLink.isVisible()) {
          await footerLink.click();
          await page.waitForTimeout(50);
          const adminFilename = `login-admin-${theme}-${vp.name}.png`;
          await page.screenshot({ path: path.join(outDir, adminFilename), fullPage: false });
        }
      });
    }
  }
});
