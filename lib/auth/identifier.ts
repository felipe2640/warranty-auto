export function formatTenantEmail(username: string, tenant: string) {
  return `${username.trim().toLowerCase()}@${tenant}.sys`
}

export function normalizeLoginIdentifier(input: string, tenant: string) {
  const normalized = input.trim().toLowerCase()
  if (normalized.includes("@")) {
    return normalized
  }

  return formatTenantEmail(normalized, tenant)
}
