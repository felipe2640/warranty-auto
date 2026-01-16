export function normalizeLoginIdentifier(input: string, tenant: string) {
  const normalized = input.trim().toLowerCase()
  if (normalized.includes("@")) {
    return normalized
  }

  return `${normalized}@${tenant}.sys`
}
