/**
 * Unified Time and Date Formatter for Aegis CAD & Portals
 * Standard: 24-hour HH:mm:ss, Asia/Kolkata timezone by default
 */

const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export function formatTime(
  dateInput?: Date | string | number | null,
  options: { showSeconds?: boolean; timeZone?: string } = {}
): string {
  if (!dateInput) return '--:--:--';
  const date = typeof dateInput === 'string' || typeof dateInput === 'number'
    ? new Date(dateInput)
    : dateInput;

  if (isNaN(date.getTime())) return '--:--:--';

  const showSeconds = options.showSeconds !== false;
  const timeZone = options.timeZone || DEFAULT_TIMEZONE;

  try {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: showSeconds ? '2-digit' : undefined,
      hour12: false,
      timeZone,
    }).format(date);
  } catch {
    // Fallback if timezone not supported
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return showSeconds ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`;
  }
}

export function formatRelativeTime(dateInput: Date | string | number | null): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' || typeof dateInput === 'number'
    ? new Date(dateInput)
    : dateInput;

  if (isNaN(date.getTime())) return '';

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 30) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}
