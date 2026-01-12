const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/
export const DEFAULT_TIMEZONE = "America/Sao_Paulo"

export function isDateOnlyString(value: string): boolean {
  return DATE_ONLY_REGEX.test(value)
}

export function toDateOnlyString(input: Date | string): string {
  if (input instanceof Date) {
    const year = input.getFullYear()
    const month = `${input.getMonth() + 1}`.padStart(2, "0")
    const day = `${input.getDate()}`.padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  if (typeof input === "string") {
    if (isDateOnlyString(input)) return input
    if (input.includes("T")) return input.split("T")[0] || ""
    const parsed = new Date(input)
    if (!Number.isNaN(parsed.getTime())) {
      const year = parsed.getFullYear()
      const month = `${parsed.getMonth() + 1}`.padStart(2, "0")
      const day = `${parsed.getDate()}`.padStart(2, "0")
      return `${year}-${month}-${day}`
    }
  }

  return ""
}

export function parseDateOnlyToUTCDate(dateOnly: string): Date {
  if (!isDateOnlyString(dateOnly)) {
    return new Date(dateOnly)
  }

  const [year, month, day] = dateOnly.split("-").map((part) => Number.parseInt(part, 10))
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
}

export function formatDateOnly(dateOnly: string): string {
  if (!isDateOnlyString(dateOnly)) return "—"
  const [year, month, day] = dateOnly.split("-")
  return `${day}/${month}/${year}`
}

export function todayDateOnly(timeZone?: string): string {
  if (timeZone) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    return formatter.format(new Date())
  }

  return toDateOnlyString(new Date())
}

export function addDaysDateOnly(dateOnly: string, days: number): string {
  const base = parseDateOnlyToUTCDate(dateOnly)
  base.setUTCDate(base.getUTCDate() + days)
  return toDateOnlyString(base)
}

export function diffDaysDateOnly(fromDateOnly: string, toDateOnly: string): number {
  if (!isDateOnlyString(fromDateOnly) || !isDateOnlyString(toDateOnly)) return 0
  const from = parseDateOnlyToUTCDate(fromDateOnly)
  const to = parseDateOnlyToUTCDate(toDateOnly)
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
}
