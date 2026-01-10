export function normalizeDigits(value: string) {
  return value.replace(/\D/g, "")
}

export function isValidCpfCnpj(value: string) {
  const digits = normalizeDigits(value)
  return digits.length === 11 || digits.length === 14
}

export function isValidCell(value: string) {
  const digits = normalizeDigits(value)
  return digits.length >= 10
}
