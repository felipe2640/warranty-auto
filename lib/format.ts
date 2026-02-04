export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "")
}

export function formatCpfCnpj(value?: string): string {
  if (!value) return "" // CHG-20250929-05: allow missing customer identifiers
  const digits = onlyDigits(value).slice(0, 14)

  if (digits.length <= 11) {
    const part1 = digits.slice(0, 3)
    const part2 = digits.slice(3, 6)
    const part3 = digits.slice(6, 9)
    const part4 = digits.slice(9, 11)
    let formatted = part1
    if (part2) formatted += `.${part2}`
    if (part3) formatted += `.${part3}`
    if (part4) formatted += `-${part4}`
    return formatted
  }

  const part1 = digits.slice(0, 2)
  const part2 = digits.slice(2, 5)
  const part3 = digits.slice(5, 8)
  const part4 = digits.slice(8, 12)
  const part5 = digits.slice(12, 14)

  let formatted = part1
  if (part2) formatted += `.${part2}`
  if (part3) formatted += `.${part3}`
  if (part4) formatted += `/${part4}`
  if (part5) formatted += `-${part5}`
  return formatted
}

export function formatPhoneBR(value?: string): string {
  if (!value) return "" // CHG-20250929-05: allow missing phone numbers
  const digits = onlyDigits(value).slice(0, 11)
  const ddd = digits.slice(0, 2)
  const part1 = digits.slice(2, digits.length > 10 ? 7 : 6)
  const part2 = digits.slice(digits.length > 10 ? 7 : 6)

  if (!ddd) return ""
  if (!part1) return `(${ddd})`
  if (!part2) return `(${ddd}) ${part1}`
  return `(${ddd}) ${part1}-${part2}`
}

export function formatMoneyBR(value: number | string): string {
  const numeric = typeof value === "number" ? value : parseMoneyBR(value)
  if (typeof numeric !== "number" || Number.isNaN(numeric)) {
    return String(value ?? "")
  }
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numeric)
}

export function parseMoneyBR(input: string): number | string {
  if (input == null) return ""
  const trimmed = String(input).trim()
  if (!trimmed) return ""

  const normalized = trimmed
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".")

  if (!normalized) return ""
  const numeric = Number(normalized)
  return Number.isNaN(numeric) ? trimmed : numeric
}

export function formatDateBR(dateIsoOrTs?: string | number | Date): string {
  if (!dateIsoOrTs) return "—"
  const date = dateIsoOrTs instanceof Date ? dateIsoOrTs : new Date(dateIsoOrTs)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("pt-BR")
}
