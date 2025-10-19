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

  // Remove common prefixes
  normalized = normalized.replace('whatsapp:', '');
  
  // Trim again after prefix removal
  normalized = normalized.trim();

  // Check if empty after cleaning
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
