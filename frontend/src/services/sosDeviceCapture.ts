import { SosDeviceContext } from '../types';

/**
 * Enterprise SOS Device Context Capture Engine
 * Captures non-blocking device telemetry with a hard 4-second budget.
 * Feature-detected with individual try/catch blocks; never blocks SOS transmission.
 */
export async function captureSosContext(): Promise<SosDeviceContext> {
  const now = new Date();
  const context: SosDeviceContext = {
    capturedAt: now.toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    deviceTime: now.toLocaleString(),
    onLine: typeof navigator !== 'undefined' ? navigator.onLine : true,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    platform: typeof navigator !== 'undefined' ? (navigator as any).userAgentData?.platform || navigator.platform : '',
    language: typeof navigator !== 'undefined' ? navigator.language : 'en',
    screenResolution: typeof window !== 'undefined' ? `${window.screen?.width}x${window.screen?.height}` : '',
    isTouch: typeof navigator !== 'undefined' ? ('maxTouchPoints' in navigator && navigator.maxTouchPoints > 0) : false,
    orientation: typeof window !== 'undefined' ? (window.screen?.orientation?.type || '') : '',
  };

  // 1. Network Information API (Chromium / WebKit)
  try {
    const nav = navigator as any;
    if (nav.connection) {
      context.connectionType = nav.connection.effectiveType || nav.connection.type;
      context.downlink = nav.connection.downlink;
      context.rtt = nav.connection.rtt;
      context.saveData = nav.connection.saveData;
    }
  } catch {}

  // 2. Battery Status API (Chromium)
  try {
    const nav = navigator as any;
    if (typeof nav.getBattery === 'function') {
      const batteryPromise = nav.getBattery().then((battery: any) => {
        context.batteryLevel = Math.round(battery.level * 100);
        context.batteryCharging = battery.charging;
      });
      // Give battery 300ms max so it doesn't hold up GPS
      await Promise.race([
        batteryPromise,
        new Promise((resolve) => setTimeout(resolve, 300))
      ]);
    }
  } catch {}

  // 3. Geolocation Permission Query
  try {
    if (navigator.permissions && navigator.permissions.query) {
      const perm = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      context.geolocationPermission = perm.state;
    }
  } catch {}

  // 4. High-Accuracy Geolocation (Hard budget ~3500ms)
  try {
    if ('geolocation' in navigator) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => resolve(), 3500);

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timer);
            context.latitude = pos.coords.latitude;
            context.longitude = pos.coords.longitude;
            context.accuracyMeters = Math.round(pos.coords.accuracy);
            context.altitude = pos.coords.altitude;
            context.speed = pos.coords.speed;
            context.heading = pos.coords.heading;
            context.positionTimestamp = pos.timestamp;
            resolve();
          },
          (_err) => {
            clearTimeout(timer);
            resolve();
          },
          {
            enableHighAccuracy: true,
            timeout: 3200,
            maximumAge: 10000,
          }
        );
      });
    }
  } catch {}

  return context;
}
