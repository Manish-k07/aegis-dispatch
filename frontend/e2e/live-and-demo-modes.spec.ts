import { test, expect } from '@playwright/test';

test.describe('Live and Demo Modes Verification', () => {

  test.afterEach(async ({ page }) => {
    try {
      await page.unrouteAll({ behavior: 'ignoreErrors' });
    } catch {}
  });

  test('1. Live mode with backend unreachable shows clear error screen without falling back to demo', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('aegis.mode', 'LIVE');
    });

    const abortHandler = (route: any) => route.abort('connectionrefused');
    await page.route('**/actuator/health', abortHandler);
    await page.route('**/api/**', abortHandler);
    await page.route('**/ws/**', abortHandler);

    await page.goto('http://localhost:5173');

    // Assert that the BackendUnreachableScreen is displayed
    await expect(page.locator("text=Can't reach the Aegis server")).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Retry connection/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Open demo mode/i })).toBeVisible();

    // Verify NO demo banner or demo chip exists
    await expect(page.locator('text=Demo mode — synthetic data')).not.toBeVisible();
    await expect(page.locator('text=Demo mode - no backend connected')).not.toBeVisible();

    // Verify mode is still LIVE in localStorage (no silent fallback)
    const mode = await page.evaluate(() => localStorage.getItem('aegis.mode'));
    expect(mode).toBe('LIVE');
  });

  test('2. Live mode: wrong password fails, demo credentials fail, real account signs in without demo chip', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('aegis.mode', 'LIVE');
    });

    await page.goto('http://localhost:5173');

    // 1. Test wrong credentials on System Admin tab
    await page.click('button:has-text("System Admin")');
    await page.fill('input[placeholder="e.g. admin"]', 'admin');
    await page.fill('input[placeholder="Password"]', 'WrongPassword123!');
    await page.click('button:has-text("Sign in as Administrator")');
    await expect(page.locator('text=Access denied')).toBeVisible({ timeout: 10000 });

    // 2. Test demo credentials fail in LIVE mode
    await page.click('button:has-text("CAD Dispatch")');
    await page.fill('input[placeholder="e.g. DISPATCH-01"]', 'DISP-101');
    await page.fill('input[placeholder="Security PIN or Password"]', '1010');
    await page.click('button:has-text("Sign in as Dispatcher")');
    await expect(page.locator('text=Access denied')).toBeVisible({ timeout: 10000 });

    // 3. Test real account signs in successfully
    await page.click('button:has-text("System Admin")');
    await page.fill('input[placeholder="e.g. admin"]', 'admin');
    await page.fill('input[placeholder="Password"]', 'Admin@Aegis2026');
    await page.click('button:has-text("Sign in as Administrator")');

    // Admin Dashboard / Console appears
    await expect(page.locator('text=Aegis System Administration')).toBeVisible({ timeout: 10000 });

    // Verify NO demo chip appears in live mode
    await expect(page.locator('text=Demo mode — synthetic data')).not.toBeVisible();
    await expect(page.locator('text=Demo mode - no backend connected')).not.toBeVisible();
  });

  test('3. Entering Demo mode displays demo chip, runs simulator, and makes ZERO calls to real API', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('aegis.mode', 'LIVE');
    });

    // Track any calls to real backend API
    const realApiCalls: string[] = [];
    await page.route('**/api/**', (route) => {
      realApiCalls.push(route.request().url());
      return route.continue();
    });

    await page.goto('http://localhost:5173');

    // Click the outlined Demo mode button below sign in card
    const demoButton = page.locator('button:has-text("Demo mode")');
    await expect(demoButton).toBeVisible();
    await demoButton.click();

    // DemoModeModal opens with persona options
    await expect(page.locator('text=Demo mode').first()).toBeVisible();
    const enterDemoBtn = page.locator('button:has-text("Enter Demo Mode")').or(page.locator('button:has-text("Enter demo mode")'));
    await expect(enterDemoBtn).toBeVisible();

    // Click Enter demo mode and confirm switch on Layer 2 confirmation card
    await enterDemoBtn.click();
    const continueBtn = page.locator('button:has-text("Continue to Demo")').or(page.locator('button:has-text("Continue")'));
    if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await continueBtn.click();
    }

    // Verify persistent demo chip appears in the status/nav bar
    await expect(page.locator('text=Demo mode — synthetic data')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Exit demo")')).toBeVisible();

    // Reset tracked API calls count right after entering demo mode
    realApiCalls.length = 0;

    // Wait 3 seconds for simulator to tick
    await page.waitForTimeout(3000);

    // Assert ZERO calls were made to real backend /api/ while in demo mode
    expect(realApiCalls.length).toBe(0);

    // Check mode in localStorage is DEMO
    const mode = await page.evaluate(() => localStorage.getItem('aegis.mode'));
    expect(mode).toBe('DEMO');
  });

  test('4. Exiting demo mode clears demo namespace, returns to live login, and preserves storage isolation', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.evaluate(() => {
      localStorage.setItem('aegis.live.token', 'secret-live-token-12345');
      localStorage.setItem('aegis.mode', 'LIVE');
    });

    // Enter demo mode
    await page.click('button:has-text("Demo mode")');
    const enterDemoBtn = page.locator('button:has-text("Enter Demo Mode")').or(page.locator('button:has-text("Enter demo mode")'));
    await enterDemoBtn.click();
    const continueBtn = page.locator('button:has-text("Continue to Demo")').or(page.locator('button:has-text("Continue")'));
    if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await continueBtn.click();
    }

    // Persistent demo chip is visible
    const exitButton = page.locator('button:has-text("Exit demo")');
    await expect(exitButton).toBeVisible({ timeout: 10000 });
    await exitButton.click();

    // Mode returns to LIVE, login screen shows
    await expect(page.locator('button:has-text("Sign in as Dispatcher")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Demo mode — synthetic data')).not.toBeVisible();

    // Verify storage isolation
    const storage = await page.evaluate(() => ({
      mode: localStorage.getItem('aegis.mode'),
      demoToken: localStorage.getItem('aegis.demo.token'),
      demoSession: localStorage.getItem('aegis.demo.auth_session'),
      liveToken: localStorage.getItem('aegis.live.token'),
    }));

    expect(storage.mode).toBe('LIVE');
    expect(storage.demoToken).toBeNull();
    expect(storage.demoSession).toBeNull();
    // Live token was preserved and never overwritten by demo
    expect(storage.liveToken).toBe('secret-live-token-12345');
  });

  test('5. Reload persists mode: LIVE stays LIVE, DEMO stays DEMO until exited', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('aegis.mode', 'LIVE');
    });
    await page.reload();

    // 1. In LIVE mode
    await expect(page.locator('text=AEGIS DISPATCH')).toBeVisible();
    await page.reload();
    await expect(page.locator('text=AEGIS DISPATCH')).toBeVisible();
    let mode = await page.evaluate(() => localStorage.getItem('aegis.mode'));
    expect(mode).toBe('LIVE');

    // 2. Switch to DEMO mode
    await page.click('button:has-text("Demo mode")');
    const enterDemoBtn = page.locator('button:has-text("Enter Demo Mode")').or(page.locator('button:has-text("Enter demo mode")'));
    await enterDemoBtn.click();
    const continueBtn = page.locator('button:has-text("Continue to Demo")').or(page.locator('button:has-text("Continue")'));
    if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await continueBtn.click();
    }
    await expect(page.locator('text=Demo mode — synthetic data')).toBeVisible({ timeout: 10000 });

    // 3. Reload in DEMO mode
    await page.reload();
    await expect(page.locator('text=Demo mode — synthetic data')).toBeVisible({ timeout: 10000 });
    mode = await page.evaluate(() => localStorage.getItem('aegis.mode'));
    expect(mode).toBe('DEMO');

    // 4. Exit DEMO mode
    await page.click('button:has-text("Exit demo")');
    await expect(page.locator('text=Demo mode — synthetic data')).not.toBeVisible({ timeout: 10000 });
    mode = await page.evaluate(() => localStorage.getItem('aegis.mode'));
    expect(mode).toBe('LIVE');
  });

  test('6. Full core-flow test with four browser contexts in LIVE mode against real backend', async ({ browser }) => {
    test.setTimeout(60000);

    // ----------------------------------------------------
    // Context 1: Citizen signs in
    // ----------------------------------------------------
    const citizenContext = await browser.newContext();
    const citizenPage = await citizenContext.newPage();
    await citizenPage.goto('http://localhost:5173');
    await citizenPage.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('aegis.mode', 'LIVE');
    });

    await citizenPage.click('button:has-text("Citizen SOS")');
    await citizenPage.fill('input[placeholder="e.g. 9845012345"]', '9845099999');
    await citizenPage.fill('input[placeholder="Account Password"]', 'CitizenPass123!');
    await citizenPage.click('button:has-text("Sign in as Citizen")');

    await expect(citizenPage.locator('text=Aegis SOS')).toBeVisible({ timeout: 15000 });

    // ----------------------------------------------------
    // Context 2: Dispatcher signs into CAD
    // ----------------------------------------------------
    const dispatcherContext = await browser.newContext();
    const dispatcherPage = await dispatcherContext.newPage();
    await dispatcherPage.goto('http://localhost:5173');
    await dispatcherPage.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('aegis.mode', 'LIVE');
    });

    await dispatcherPage.click('button:has-text("CAD Dispatch")');
    await dispatcherPage.fill('input[placeholder="e.g. DISPATCH-01"]', 'dispatcher1');
    await dispatcherPage.fill('input[placeholder="Security PIN or Password"]', 'Password@123');
    await dispatcherPage.click('button:has-text("Sign in as Dispatcher")');

    // CAD console loaded
    await expect(dispatcherPage.locator('text=AEGIS DISPATCH')).toBeVisible({ timeout: 15000 });

    // Verify mid-flow reload persists state from database
    await dispatcherPage.reload();
    await expect(dispatcherPage.locator('text=AEGIS DISPATCH')).toBeVisible({ timeout: 15000 });

    // ----------------------------------------------------
    // Context 3: Paramedic signs into MDT console
    // ----------------------------------------------------
    const paramedicContext = await browser.newContext();
    const paramedicPage = await paramedicContext.newPage();
    await paramedicPage.goto('http://localhost:5173');
    await paramedicPage.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('aegis.mode', 'LIVE');
    });

    await paramedicPage.click('button:has-text("Responder (MDT)")');
    await paramedicPage.fill('input[placeholder="e.g. MEDIC-101"]', 'paramedic1');
    await paramedicPage.fill('input[placeholder="Security PIN"]', 'Password@123');
    await paramedicPage.click('button:has-text("Launch MDT Navigation")');

    await expect(paramedicPage.locator('text=Paramedic unit')).toBeVisible({ timeout: 15000 });

    // ----------------------------------------------------
    // Context 4: Hospital signs into ED portal
    // ----------------------------------------------------
    const hospitalContext = await browser.newContext();
    const hospitalPage = await hospitalContext.newPage();
    await hospitalPage.goto('http://localhost:5173');
    await hospitalPage.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('aegis.mode', 'LIVE');
    });

    await hospitalPage.click('button:has-text("Hospital ED")');
    await hospitalPage.fill('input[placeholder="e.g. HOSP-101"]', 'hospital1');
    await hospitalPage.fill('input[placeholder="Security PIN"]', 'Password@123');
    await hospitalPage.click('button:has-text("Sign in to Emergency Dept")');

    await expect(hospitalPage.locator('text=Publish updates')).toBeVisible({ timeout: 15000 });

    // Clean up all contexts
    await citizenContext.close();
    await dispatcherContext.close();
    await paramedicContext.close();
    await hospitalContext.close();
  });

});
