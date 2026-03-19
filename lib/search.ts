import { normalizeDigits } from "@/lib/validation"

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .trim()
}

function addPrefixTokens(tokens: Set<string>, token: string, minLen: number) {
  tokens.add(token)
  for (let i = minLen; i < token.length; i++) {
    tokens.add(token.slice(0, i))
  }
}

export function buildSearchTokens(input: {
  nomeRazaoSocial?: string // CHG-20250929-02: allow tickets without customer name
  cpfCnpj?: string
  celular?: string
  numeroVendaOuCfe?: string
  codigo?: string
  ref?: string
  numeroSerie?: string
}) {
  const tokens = new Set<string>()

  if (input.nomeRazaoSocial) {
    const nameTokens = normalizeText(input.nomeRazaoSocial).split(/\s+/).filter(Boolean)
    nameTokens.forEach((token) => addPrefixTokens(tokens, token, 3))
  }

  const cpfCnpj = input.cpfCnpj ? normalizeDigits(input.cpfCnpj) : ""
  const celular = input.celular ? normalizeDigits(input.celular) : ""
  const venda = input.numeroVendaOuCfe ? normalizeDigits(input.numeroVendaOuCfe) : ""

  if (cpfCnpj) addPrefixTokens(tokens, cpfCnpj, 4)
  if (celular) addPrefixTokens(tokens, celular, 4)
  if (venda) addPrefixTokens(tokens, venda, 4)

  if (input.codigo) addPrefixTokens(tokens, normalizeText(input.codigo), 3)
  if (input.ref) addPrefixTokens(tokens, normalizeText(input.ref), 3)
  if (input.numeroSerie) addPrefixTokens(tokens, normalizeText(input.numeroSerie), 3)

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
