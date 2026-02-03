import { normalizeDigits } from "@/lib/validation"

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .trim()
}

export function buildSearchTokens(input: {
  nomeRazaoSocial?: string // CHG-20250929-02: allow tickets without customer name
  cpfCnpj?: string
  celular?: string
  numeroVendaOuCfe?: string
  codigo?: string
  ref?: string
}) {
  const tokens = new Set<string>()

  if (input.nomeRazaoSocial) {
    const nameTokens = normalizeText(input.nomeRazaoSocial).split(/\s+/).filter(Boolean)
    nameTokens.forEach((token) => tokens.add(token))
  }

  const cpfCnpj = input.cpfCnpj ? normalizeDigits(input.cpfCnpj) : ""
  const celular = input.celular ? normalizeDigits(input.celular) : ""
  const venda = input.numeroVendaOuCfe ? normalizeDigits(input.numeroVendaOuCfe) : ""

  if (cpfCnpj) tokens.add(cpfCnpj)
  if (celular) tokens.add(celular)
  if (venda) tokens.add(venda)

  if (input.codigo) tokens.add(normalizeText(input.codigo))
  if (input.ref) tokens.add(normalizeText(input.ref))

  return Array.from(tokens).filter(Boolean)
}

export function normalizeSearchToken(value: string) {
  const normalized = normalizeText(value)
  if (!normalized) {
    return ""
  }
  const token = normalized.split(/\s+/)[0]
  return normalizeDigits(token) || token
}
