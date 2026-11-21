/** Same rules as the API (class-validator IsStrongPassword): 8+ chars, lower, upper, number and symbol. */
const SYMBOLS = /[-#!$@£%^&*()_+|~=`{}[\]:";'<>?,./\\ ]/

export const PASSWORD_RULES = [
  { id: 'length', label: '8 caracteres', test: (pw: string) => pw.length >= 8 },
  { id: 'lower', label: 'Una minúscula', test: (pw: string) => /[a-z]/.test(pw) },
  { id: 'upper', label: 'Una mayúscula', test: (pw: string) => /[A-Z]/.test(pw) },
  { id: 'number', label: 'Un número', test: (pw: string) => /[0-9]/.test(pw) },
  { id: 'symbol', label: 'Un símbolo', test: (pw: string) => SYMBOLS.test(pw) },
] as const

export function isStrongPassword(pw: string) {
  return PASSWORD_RULES.every((rule) => rule.test(pw))
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** The API normalizes emails to lowercase without surrounding spaces. */
export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function isValidEmail(email: string) {
  return EMAIL.test(normalizeEmail(email))
}
