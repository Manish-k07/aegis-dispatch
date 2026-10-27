/**
 * System-wide formatters for clean, readable displays without raw enums or dangling separators.
 */

export function formatRole(role?: string): string {
  if (!role) return 'Unknown';
  switch (role.toUpperCase()) {
    case 'DISPATCHER':
      return 'Dispatcher';
    case 'PARAMEDIC':
      return 'Paramedic';
    case 'HOSPITAL_STAFF':
      return 'Hospital staff';
    case 'CITIZEN':
      return 'Citizen';
    case 'ADMIN':
      return 'Administrator';
    default:
      return role
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export function formatUnitStatus(status?: string): string {
  if (!status) return 'Unknown';
  switch (status.toUpperCase()) {
    case 'AVAILABLE':
      return 'Available';
    case 'DISPATCHED':
      return 'Dispatched';
    case 'EN_ROUTE':
      return 'En route';
    case 'ON_SCENE':
      return 'On scene';
    case 'TRANSPORTING':
      return 'Transporting';
    case 'AT_HOSPITAL':
      return 'At hospital';
    case 'RETURNING':
      return 'Returning';
    case 'OUT_OF_SERVICE':
      return 'Out of service';
    default:
      return status
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export function formatUnitType(type?: string): string {
  if (!type) return 'Unknown';
  switch (type.toUpperCase()) {
    case 'ALS':
      return 'Advanced Life Support (ALS)';
    case 'BLS':
      return 'Basic Life Support (BLS)';
    case 'MICU':
      return 'Mobile ICU (MICU)';
    default:
      return type;
  }
}

export function formatPhone(raw?: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    const main = digits.slice(2);
    return `+91 ${main.slice(0, 5)} ${main.slice(5)}`;
  }
  return raw;
}

export function joinNonEmpty(
  items: (string | number | undefined | null | false)[],
  separator: string = ' · '
): string {
  return items.filter((item) => item !== undefined && item !== null && item !== '' && item !== false).join(separator);
}
