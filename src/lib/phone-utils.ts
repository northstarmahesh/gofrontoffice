/**
 * Normalizes a phone number to international format with + prefix
 * @param phoneNumber - The phone number to normalize
 * @returns Normalized phone number with + prefix, or empty string if invalid
 */
export function normalizePhoneNumber(phoneNumber: string | null | undefined): string {
  if (!phoneNumber) {
    return '';
  }

  // Trim whitespace
  let normalized = phoneNumber.trim();

  // Check if empty after trimming
  if (normalized === '') {
    return '';
  }

  // Remove leading + if present for processing
  if (normalized.startsWith('+')) {
    normalized = normalized.substring(1);
  }

  // Remove any leading zeros (common mistake)
  normalized = normalized.replace(/^0+/, '');

  // Add + prefix back
  normalized = `+${normalized}`;

  return normalized;
}

/**
 * Validates a phone number format
 * @param phoneNumber - The phone number to validate
 * @returns true if valid, false otherwise
 */
export function isValidPhoneNumber(phoneNumber: string | null | undefined): boolean {
  if (!phoneNumber) {
    return false;
  }

  const normalized = normalizePhoneNumber(phoneNumber);
  
  // Must start with + and have at least 8 digits after it (minimum international format)
  const phoneRegex = /^\+\d{8,15}$/;
  return phoneRegex.test(normalized);
}
