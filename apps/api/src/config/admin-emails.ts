export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function parseAdminEmails(value: string): string[] {
  return value.split(',').map(normalizeEmail).filter(Boolean);
}
