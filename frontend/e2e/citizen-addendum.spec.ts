import { test, expect } from '@playwright/test';

test.describe('Citizen Addendum End-to-End Tests (Demo Mode)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('aegis.mode', 'DEMO');
      localStorage.removeItem('aegis.demo.auth_session');
    });
  });

  test('1. Phone OTP -> Onboarding screen -> Citizen Dashboard', async ({ page }) => {
    await page.goto('/');

    const citizenTab = page.locator('#login-tab-citizen');
    await expect(citizenTab).toBeVisible({ timeout: 10000 });
    await citizenTab.click();

    const phoneInput = page.locator('#citizen-otp-phone');
    await expect(phoneInput).toBeVisible({ timeout: 5000 });
    await phoneInput.fill('9876543210');

    const getOtpBtn = page.locator('button').filter({ hasText: /Get OTP/i });
    await getOtpBtn.click();

    const otpInput = page.locator('#citizen-otp-code');
    await expect(otpInput).toBeVisible({ timeout: 5000 });
    await otpInput.fill('1120');

    const verifyBtn = page.locator('button').filter({ hasText: /Verify & Continue/i });
    await verifyBtn.click();

    await expect(page.locator('text=Complete Your Citizen Profile')).toBeVisible({ timeout: 10000 });

    await page.getByLabel('Full Legal Name *').fill('Rohan Verma');
    await page.getByLabel('Home Address *').fill('123 MG Road, Indiranagar');
    await page.getByLabel('Nearby Landmark *').fill('Opposite Metro Pillar 42');
    await page.getByLabel('Contact Full Name *').fill('Anita Verma');
    await page.getByLabel('Relationship *').fill('Mother');
    await page.getByLabel('Contact Phone *').fill('+91 98450 11223');

    const submitBtn = page.locator('button').filter({ hasText: /Save & Continue/i });
    await submitBtn.click();

    await expect(page.locator('text=Request emergency medical assistance')).toBeVisible({ timeout: 10000 });
  });

  test('2. Google Demo -> Email OTP step -> Onboarding', async ({ page }) => {
    await page.goto('/');

    const citizenTab = page.locator('#login-tab-citizen');
    await expect(citizenTab).toBeVisible({ timeout: 10000 });
    await citizenTab.click();

    const googleBtn = page.locator('#btn-google-signin');
    await expect(googleBtn).toBeVisible({ timeout: 5000 });
    await googleBtn.click();

    await expect(page.locator('text=Verify Your Email')).toBeVisible({ timeout: 5000 });

    const otpInput = page.locator('#google-email-otp');
    await expect(otpInput).toBeVisible({ timeout: 5000 });
    await otpInput.fill('123456');

    const verifyBtn = page.locator('button').filter({ hasText: /Verify & Continue/i });
    await verifyBtn.click();

    await expect(page.locator('text=Complete Your Citizen Profile')).toBeVisible({ timeout: 10000 });
  });

  test('3. Emergency Request with "Other" and typed text description', async ({ page }) => {
    // Clear demo emergencies for fresh request intake
    await page.addInitScript(() => {
      localStorage.setItem('aegis.demo.dashboard', JSON.stringify({
        emergencies: [],
        ambulances: [],
        hospitals: [],
        dispatches: []
      }));
    });

    await page.goto('/');

    const citizenTab = page.locator('#login-tab-citizen');
    await expect(citizenTab).toBeVisible({ timeout: 10000 });
    await citizenTab.click();

    const existingGoogleBtn = page.locator('#btn-google-demo-existing');
    await expect(existingGoogleBtn).toBeVisible({ timeout: 5000 });
    await existingGoogleBtn.click();

    await expect(page.locator('text=Request emergency medical assistance')).toBeVisible({ timeout: 10000 });

    const otherOption = page.locator('button').filter({ hasText: 'Other (type to describe)' });
    await expect(otherOption).toBeVisible({ timeout: 5000 });
    await otherOption.click();

    const descField = page.locator('#citizen-other-description');
    await expect(descField).toBeVisible({ timeout: 5000 });
    await descField.fill('Severe accidental chemical splash in eyes');

    const requestBtn = page.locator('#btn-request-ambulance');
    await requestBtn.click();

    const sendNowBtn = page.locator('#btn-send-sos-now');
    await expect(sendNowBtn).toBeVisible({ timeout: 5000 });
    await sendNowBtn.click();

    await expect(page.locator('text=Other: Severe accidental chemical splash in eyes')).toBeVisible({ timeout: 10000 });
  });

  test('4. Cancel Dialog requires a reason before cancelling', async ({ page }) => {
    // Seed an emergency for Priya Sharma
    await page.addInitScript(() => {
      localStorage.setItem('aegis.demo.dashboard', JSON.stringify({
        ambulances: [
          {
            id: '20000000-0000-0000-0000-000000000001',
            registrationNumber: 'KA-01-AE-1001',
            type: 'ALS',
            status: 'DISPATCHED',
            driverName: 'R. Deshmukh',
            emtName: 'Dr. A. Verma',
            latitude: 12.9710,
            longitude: 77.5930,
            speed: 35,
            heading: 90,
            lastLocationAt: new Date().toISOString(),
          }
        ],
        hospitals: [
          {
            id: '10000000-0000-0000-0000-000000000001',
            name: 'Aegis City General',
            phone: '080-40001001',
            address: 'Demo Medical District, Richmond Circle, Bengaluru',
            latitude: 12.9719,
            longitude: 77.5949,
            emergencyDepartment: true,
            icuAvailable: true,
            cardiacServices: true,
            pediatricServices: true,
            maternityServices: true,
            totalBeds: 160,
            availableBeds: 48,
            icuBedsTotal: 28,
            icuBedsAvailable: 7,
            traumaBaysTotal: 10,
            traumaBaysAvailable: 4,
            status: 'AVAILABLE',
          }
        ],
        emergencies: [
          {
            id: '30000000-0000-0000-0000-000000000003',
            callerName: 'Priya Sharma',
            phone: '9845012345',
            type: 'CARDIAC',
            priority: 'CRITICAL',
            status: 'DISPATCHED',
            address: 'Cunningham Road, Bengaluru',
            latitude: 12.9812,
            longitude: 77.5877,
            patientCount: 1,
            description: 'Crushing retrosternal chest pain radiating to left arm and jaw.',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        ],
        dispatches: [
          {
            id: 'disp-003',
            emergencyId: '30000000-0000-0000-0000-000000000003',
            ambulanceId: '20000000-0000-0000-0000-000000000001',
            dispatcherName: 'Demo Commander',
            status: 'DISPATCHED',
            distanceKm: 2.1,
            etaMinutes: 4,
            hospitalId: '10000000-0000-0000-0000-000000000001',
            assignedAt: new Date().toISOString(),
          }
        ],
        activeSimulations: []
      }));
    });

    await page.goto('/');

    const citizenTab = page.locator('#login-tab-citizen');
    await expect(citizenTab).toBeVisible({ timeout: 10000 });
    await citizenTab.click();

    const existingGoogleBtn = page.locator('#btn-google-demo-existing');
    await expect(existingGoogleBtn).toBeVisible({ timeout: 5000 });
    await existingGoogleBtn.click();

    const cancelBtn = page.locator('button').filter({ hasText: /Cancel emergency request/i });
    await expect(cancelBtn).toBeVisible({ timeout: 10000 });
    await cancelBtn.click();

    await expect(page.getByRole('heading', { name: 'Cancel Emergency Request' })).toBeVisible({ timeout: 5000 });

    const confirmCancelBtn = page.locator('#btn-confirm-cancel');
    await expect(confirmCancelBtn).toBeVisible({ timeout: 5000 });
    await confirmCancelBtn.click();

    await expect(page.locator('text=Please select a reason for cancelling')).toBeVisible({ timeout: 5000 });

    const reasonRadio = page.locator('input[value="SITUATION_RESOLVED"]');
    await reasonRadio.click();

    await confirmCancelBtn.click();

    await expect(page.locator('text=Emergency request cancelled and CAD notified')).toBeVisible({ timeout: 5000 });
  });

  test('5. SOS initiation with mocked geolocation and telemetry', async ({ context, page }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 12.9352, longitude: 77.6245, accuracy: 8 });

    // Clear active emergencies for fresh SOS intake
    await page.addInitScript(() => {
      localStorage.setItem('aegis.demo.dashboard', JSON.stringify({
        emergencies: [],
        ambulances: [],
        hospitals: [],
        dispatches: []
      }));
    });

    await page.goto('/');

    const citizenTab = page.locator('#login-tab-citizen');
    await expect(citizenTab).toBeVisible({ timeout: 10000 });
    await citizenTab.click();

    const existingGoogleBtn = page.locator('#btn-google-demo-existing');
    await expect(existingGoogleBtn).toBeVisible({ timeout: 5000 });
    await existingGoogleBtn.click();

    const triggerSosBtn = page.locator('#btn-request-ambulance');
    await expect(triggerSosBtn).toBeVisible({ timeout: 10000 });
    await triggerSosBtn.click();

    await expect(page.locator('#sos-countdown-container')).toBeVisible({ timeout: 5000 });

    const sendNowBtn = page.locator('#btn-send-sos-now');
    await expect(sendNowBtn).toBeVisible({ timeout: 5000 });
    await sendNowBtn.click();

    await expect(page.locator('text=Emergency assistance dispatched')).toBeVisible({ timeout: 10000 });
  });
  test('6. Self-Register requires Phone OTP before account details', async ({ page }) => {
    await page.goto('/');

    const citizenTab = page.locator('#login-tab-citizen');
    await expect(citizenTab).toBeVisible({ timeout: 10000 });
    await citizenTab.click();

    const selfRegTab = page.locator('button').filter({ hasText: 'Self-Register' });
    await selfRegTab.click();

    const phoneInput = page.locator('#citizen-reg-phone');
    await expect(phoneInput).toBeVisible({ timeout: 5000 });
    await phoneInput.fill('9988776655');

    const getCodeBtn = page.locator('button').filter({ hasText: /Get Verification Code/i });
    await getCodeBtn.click();

    const otpInput = page.locator('#citizen-reg-otp');
    await expect(otpInput).toBeVisible({ timeout: 5000 });
    await otpInput.fill('1120');

    const verifyPhoneBtn = page.locator('button').filter({ hasText: /Verify Phone/i });
    await verifyPhoneBtn.click();

    const nameInput = page.locator('#citizen-reg-name');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill('Vikram Malhotra');

    await page.locator('#citizen-reg-password').fill('Secret1234!');
    await page.locator('#citizen-reg-confirm').fill('Secret1234!');

    const createBtn = page.locator('button').filter({ hasText: /Create account/i });
    await createBtn.click();

    await expect(page.locator('text=Complete Your Citizen Profile')).toBeVisible({ timeout: 10000 });
  });
});