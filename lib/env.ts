export function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Variavel de ambiente obrigatoria nao encontrada: ${name}`)
  }
  return value
}
