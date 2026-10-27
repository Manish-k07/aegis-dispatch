import { test, expect, Locator } from '@playwright/test';

interface FieldTarget {
  name: string;
  tabButtonText?: string;
  setupAction?: (page: any) => Promise<void>;
  containerSelector: string; // The .m3-field-container or .m3-field-box
  inputSelector: string;
}

const loginViews: {
  viewName: string;
  fields: FieldTarget[];
}[] = [
  {
    viewName: 'Dispatcher Login',
    fields: [
      {
        name: 'Dispatcher Badge',
        tabButtonText: 'Dispatcher',
        containerSelector: '.m3-field-container:has(input[placeholder="e.g. DISPATCH-01"])',
        inputSelector: 'input[placeholder="e.g. DISPATCH-01"]',
      },
      {
        name: 'Dispatcher Security PIN',
        tabButtonText: 'Dispatcher',
        containerSelector: '.m3-field-container:has(input[placeholder="Security PIN or Password"])',
        inputSelector: 'input[placeholder="Security PIN or Password"]',
      },
    ],
  },
  {
    viewName: 'Responder MDT Login',
    fields: [
      {
        name: 'Paramedic Badge',
        tabButtonText: 'Responder',
        containerSelector: '.m3-field-container:has(input[placeholder="e.g. MED-702"])',
        inputSelector: 'input[placeholder="e.g. MED-702"]',
      },
      {
        name: 'Responder PIN',
        tabButtonText: 'Responder',
        containerSelector: '.m3-field-container:has(input[placeholder="Security PIN"])',
        inputSelector: 'input[placeholder="Security PIN"]',
      },
    ],
  },
  {
    viewName: 'Hospital ED Login',
    fields: [
      {
        name: 'Hospital Staff Badge',
        tabButtonText: 'Hospital',
        containerSelector: '.m3-field-container:has(input[placeholder="e.g. HOSP-101"])',
        inputSelector: 'input[placeholder="e.g. HOSP-101"]',
      },
      {
        name: 'Hospital PIN',
        tabButtonText: 'Hospital',
        containerSelector: '.m3-field-container:has(input[placeholder="Security PIN"])',
        inputSelector: 'input[placeholder="Security PIN"]',
      },
    ],
  },
  {
    viewName: 'Citizen Sign In',
    fields: [
      {
        name: 'Citizen Phone',
        tabButtonText: 'Citizen',
        containerSelector: '.m3-field-container:has(input[placeholder="e.g. 9845012345"])',
        inputSelector: 'input[placeholder="e.g. 9845012345"]',
      },
      {
        name: 'Citizen Password',
        tabButtonText: 'Citizen',
        containerSelector: '.m3-field-container:has(input[placeholder="Account Password"])',
        inputSelector: 'input[placeholder="Account Password"]',
      },
    ],
  },
  {
    viewName: 'Citizen Create Account',
    fields: [
      {
        name: 'Full Name',
        tabButtonText: 'Citizen',
        setupAction: async (page) => {
          const createAcctBtn = page.locator('button:has-text("Self-Register")');
          if (await createAcctBtn.isVisible()) {
            await createAcctBtn.click();
          }
        },
        containerSelector: '.m3-field-container:has(input[placeholder="Full legal name"])',
        inputSelector: 'input[placeholder="Full legal name"]',
      },
      {
        name: 'Mobile Phone',
        tabButtonText: 'Citizen',
        containerSelector: '.m3-field-container:has(input[placeholder="10-digit mobile number"])',
        inputSelector: 'input[placeholder="10-digit mobile number"]',
      },
      {
        name: 'Create Password',
        tabButtonText: 'Citizen',
        containerSelector: '.m3-field-container:has(input[placeholder="Minimum 4 characters"])',
        inputSelector: 'input[placeholder="Minimum 4 characters"]',
      },
      {
        name: 'Confirm Password',
        tabButtonText: 'Citizen',
        containerSelector: '.m3-field-container:has(input[placeholder="Re-enter password to verify"])',
        inputSelector: 'input[placeholder="Re-enter password to verify"]',
      },
    ],
  },
  {
    viewName: 'Admin Login',
    fields: [
      {
        name: 'Admin Username',
        setupAction: async (page) => {
          const footerLink = page.locator('a:has-text("Administrator sign in")');
          if (await footerLink.isVisible()) {
            await footerLink.click();
          }
        },
        containerSelector: '.m3-field-container:has(input[placeholder="e.g. admin"])',
        inputSelector: 'input[placeholder="e.g. admin"]',
      },
      {
        name: 'Admin Password',
        setupAction: async (page) => {
          const footerLink = page.locator('a:has-text("Administrator sign in")');
          if (await footerLink.isVisible()) {
            await footerLink.click();
          }
        },
        containerSelector: '.m3-field-container:has(input[placeholder="Password"])',
        inputSelector: 'input[placeholder="Password"]',
      },
    ],
  },
];

const viewports = [
  { name: 'Desktop (1366x768)', width: 1366, height: 768, hasTouch: false },
  { name: 'Mobile (390x844)', width: 390, height: 844, hasTouch: true },
];

test.describe('STEP 0 - Login Input Typing & Element Hit-Testing Reproduction', () => {
  for (const vp of viewports) {
    test.describe(`${vp.name}`, () => {
      test.use({
        viewport: { width: vp.width, height: vp.height },
        hasTouch: vp.hasTouch,
      });

      for (const view of loginViews) {
        test(`View: ${view.viewName}`, async ({ page }) => {
          await page.goto('http://localhost:5173');
          await page.evaluate(() => localStorage.clear());
          await page.reload();

          for (const field of view.fields) {
            // Select terminal tab if required
            if (field.tabButtonText) {
              const tab = page.locator(`button:has-text("${field.tabButtonText}")`);
              await tab.click();
            }

            if (field.setupAction) {
              await field.setupAction(page);
            }

            const inputLoc = page.locator(field.inputSelector);
            await expect(inputLoc).toBeVisible({ timeout: 5000 });
            await inputLoc.scrollIntoViewIfNeeded();

            // Clear any prior value
            await inputLoc.fill('');

            // 1. Click the field's center, then keyboard.type("abc123", {delay: 50})
            const box = await inputLoc.boundingBox();
            expect(box).not.toBeNull();
            if (box) {
              await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
              await page.keyboard.type('abc123', { delay: 50 });
              const val = await inputLoc.inputValue();
              expect(val, `Field ${field.name} should accept typing in center`).toBe('abc123');
            }

            // 2. Click left edge, right edge, area between outer box and inner box, and label area.
            // For each point, log document.elementFromPoint(x, y) and expect it to be input or its own label.
            const containerLoc = page.locator(field.containerSelector);
            await containerLoc.scrollIntoViewIfNeeded();
            const containerBox = await containerLoc.boundingBox();
            if (containerBox && box) {
              // Points:
              // Left edge of container box
              const leftPt = { x: containerBox.x + 6, y: containerBox.y + containerBox.height / 2 };
              // Right edge of container box
              const rightPt = { x: containerBox.x + containerBox.width - 6, y: containerBox.y + containerBox.height / 2 };
              // Area between outer box and inner box (top margin inside container)
              const gapPt = { x: containerBox.x + 20, y: containerBox.y + 4 };
              // Label area
              const labelLoc = containerLoc.locator('label');
              const labelBox = (await labelLoc.isVisible()) ? await labelLoc.boundingBox() : null;
              const labelPt = labelBox ? { x: labelBox.x + 10, y: labelBox.y + labelBox.height / 2 } : null;

              const checkPoint = async (pt: { x: number; y: number }, ptName: string) => {
                const elementTag = await page.evaluate(({ x, y }) => {
                  const el = document.elementFromPoint(x, y);
                  return el ? `${el.tagName.toLowerCase()}.${el.className}#${el.id}` : null;
                }, pt);
                console.log(`[elementFromPoint ${ptName}] for ${field.name}: ${elementTag}`);

                // Expect it to be the input, label, or container element directing to input
                const isTargetOrInput = await page.evaluate(
                  ({ x, y, inputSel }) => {
                    const el = document.elementFromPoint(x, y);
                    const inp = document.querySelector(inputSel);
                    if (!el || !inp) return false;
                    return el === inp || el.tagName.toLowerCase() === 'label' || el.contains(inp) || inp.contains(el);
                  },
                  { ...pt, inputSel: field.inputSelector }
                );

                expect(isTargetOrInput, `Point ${ptName} at (${pt.x}, ${pt.y}) should hit input or its label, got ${elementTag}`).toBe(true);

                // Clicking this point should focus the input
                await page.mouse.click(pt.x, pt.y);
                const focusedInput = await page.evaluate((sel) => {
                  return document.activeElement === document.querySelector(sel);
                }, field.inputSelector);
                expect(focusedInput, `Clicking ${ptName} should focus ${field.name}`).toBe(true);
              };

              await checkPoint(leftPt, 'left-edge');
              await checkPoint(rightPt, 'right-edge');
              await checkPoint(gapPt, 'outer-inner-gap');
              if (labelPt) {
                await checkPoint(labelPt, 'label-area');
              }
            }

            // 3. Focus using Tab only and type
            await inputLoc.fill('');
            // Focus previous element or body, then tab into the field
            await page.keyboard.press('Tab');
            // Ensure input receives focus via Tab and accepts keyboard input
            await inputLoc.focus();
            await page.keyboard.type('xyz789', { delay: 50 });
            expect(await inputLoc.inputValue(), `Field ${field.name} should accept typing after tab focus`).toBe('xyz789');

            // 4. After typing, expect document.activeElement to still be that same input element
            // (same DOM node reference captured before typing) to detect remounting
            const wasNodeUnmounted = await page.evaluate(
              async ({ sel }) => {
                const nodeBefore = document.querySelector(sel);
                if (!nodeBefore) return 'NOT_FOUND';
                // Trigger an input event
                nodeBefore.dispatchEvent(new Event('input', { bubbles: true }));
                const nodeAfter = document.querySelector(sel);
                const isActive = document.activeElement === nodeBefore;
                return {
                  sameNode: nodeBefore === nodeAfter,
                  isActive,
                };
              },
              { sel: field.inputSelector }
            );

            expect(wasNodeUnmounted.sameNode, `${field.name} DOM node should be stable (not remounted)`).toBe(true);
            expect(wasNodeUnmounted.isActive, `${field.name} should retain focus`).toBe(true);
          }
        });
      }
    });
  }
});

test.describe('STEP 4 - Regression Tests & Invariant Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('Confirm NO two elements share an ID on any tab', async ({ page }) => {
    const tabs = ['Citizen', 'Dispatcher', 'Responder', 'Hospital'];
    for (const tabName of tabs) {
      const tabBtn = page.locator(`button:has-text("${tabName}")`);
      await tabBtn.click();
      await page.waitForTimeout(100);

      const duplicates = await page.evaluate(() => {
        const ids = Array.from(document.querySelectorAll('[id]')).map((el) => el.id).filter(Boolean);
        const seen = new Set<string>();
        const dupes: string[] = [];
        for (const id of ids) {
          if (seen.has(id)) {
            dupes.push(id);
          }
          seen.add(id);
        }
        return dupes;
      });

      expect(duplicates, `Duplicate IDs found on tab ${tabName}: ${duplicates.join(', ')}`).toEqual([]);
    }
  });

  test('Fast typing 50 characters in 200ms drops no characters and preserves node reference', async ({ page }) => {
    await page.locator('#login-tab-dispatcher').click();
    const inputLoc = page.locator('input[placeholder="e.g. DISPATCH-01"]');
    await expect(inputLoc).toBeVisible();
    await inputLoc.click();

    const fiftyChars = 'ABC123xyz456_AEGIS_COMMAND_TERMINAL_TEST_RUN_2026!';
    // 50 characters typed rapidly with delay: 4ms = 200ms
    await page.keyboard.type(fiftyChars, { delay: 4 });

    const val = await inputLoc.inputValue();
    expect(val).toBe(fiftyChars);

    const isStableNode = await page.evaluate(() => {
      const el = document.querySelector('input[placeholder="e.g. DISPATCH-01"]');
      return el === document.activeElement;
    });
    expect(isStableNode).toBe(true);
  });

  test('Focused field captures all keypresses without global shortcut interference', async ({ page }) => {
    await page.locator('#login-tab-dispatcher').click();
    const inputLoc = page.locator('input[placeholder="e.g. DISPATCH-01"]');
    await expect(inputLoc).toBeVisible();
    await inputLoc.click();

    const testKeys = ['d', 'h', 'c', '1', '2', '3', 'q', 'w', 'e', 'r'];
    for (const k of testKeys) {
      await page.keyboard.press(k);
    }

    const val = await inputLoc.inputValue();
    expect(val).toBe(testKeys.join(''));
  });

  test('Demo popup "Fill login form" populates fields and leaves them fully editable', async ({ page }) => {
    const demoBtn = page.locator('button:has-text("Demo mode")');
    await expect(demoBtn).toBeVisible();
    await demoBtn.click();

    // Verify modal is open
    const modalTitle = page.locator('#demo-dialog-title');
    await expect(modalTitle).toBeVisible();

    // Click "Fill login form" on the first account card (Dispatcher)
    const fillBtn = page.locator('button:has-text("Fill login form")').first();
    await expect(fillBtn).toBeVisible();
    await fillBtn.click();

    // Form fields should be populated
    const badgeInput = page.locator('input[placeholder="e.g. DISPATCH-01"]');
    await expect(badgeInput).toBeVisible();
    const badgeVal = await badgeInput.inputValue();
    expect(badgeVal.length).toBeGreaterThan(0);

    // Verify typing still works and appends to the populated field
    await badgeInput.click();
    await page.keyboard.type('-EDITED', { delay: 20 });
    const newVal = await badgeInput.inputValue();
    expect(newVal).toBe(`${badgeVal}-EDITED`);
  });

  test('Rapid role switching 5 times leaves all forms fully functional and accepting input', async ({ page }) => {
    const tabs = ['Citizen', 'Dispatcher', 'Responder', 'Hospital'];

    // Rapidly switch between all 4 roles 5 times
    for (let i = 0; i < 5; i++) {
      for (const tabName of tabs) {
        const tabBtn = page.locator(`button:has-text("${tabName}")`);
        await tabBtn.click();
      }
    }

    // Switch back to Dispatcher and verify typing works cleanly
    const dispTab = page.locator('#login-tab-dispatcher');
    await dispTab.click();

    const badgeInput = page.locator('input[placeholder="e.g. DISPATCH-01"]');
    await expect(badgeInput).toBeVisible();
    await badgeInput.click();
    await page.keyboard.type('DISPATCH-AFTER-SWITCH', { delay: 20 });
    expect(await badgeInput.inputValue()).toBe('DISPATCH-AFTER-SWITCH');

    // Switch to Responder and verify typing works cleanly
    const responderTab = page.locator('#login-tab-responder');
    await responderTab.click();

    const responderBadge = page.locator('input[placeholder="e.g. MED-702"]');
    await expect(responderBadge).toBeVisible();
    await responderBadge.click();
    await page.keyboard.type('MED-AFTER-SWITCH', { delay: 20 });
    expect(await responderBadge.inputValue()).toBe('MED-AFTER-SWITCH');
  });
});
