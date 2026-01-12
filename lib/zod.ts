import { z, ZodIssueCode } from "zod"

const errorMap: z.ZodErrorMap = (issue, _ctx) => {
  if (issue.message) {
    return { message: issue.message }
  }

  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === "undefined" || issue.received === "null") {
        return { message: "Campo obrigatorio" }
      }
      return { message: "Tipo invalido" }
    case ZodIssueCode.too_small:
      if (issue.type === "string") {
        return { message: `Deve ter no minimo ${issue.minimum} caracteres` }
      }
      if (issue.type === "number") {
        return { message: `Deve ser no minimo ${issue.minimum}` }
      }
      if (issue.type === "array") {
        return { message: `Deve ter no minimo ${issue.minimum} itens` }
      }
      return { message: "Valor muito pequeno" }
    case ZodIssueCode.too_big:
      if (issue.type === "string") {
        return { message: `Deve ter no maximo ${issue.maximum} caracteres` }
      }
      if (issue.type === "number") {
        return { message: `Deve ser no maximo ${issue.maximum}` }
      }
      if (issue.type === "array") {
        return { message: `Deve ter no maximo ${issue.maximum} itens` }
      }
      return { message: "Valor muito grande" }
    case ZodIssueCode.invalid_string:
      if (issue.validation === "email") {
        return { message: "Email invalido" }
      }
      if (issue.validation === "url") {
        return { message: "URL invalida" }
      }
      return { message: "Formato invalido" }
    case ZodIssueCode.invalid_enum_value:
    case ZodIssueCode.invalid_literal:
    case ZodIssueCode.invalid_union:
    case ZodIssueCode.invalid_union_discriminator:
      return { message: "Valor invalido" }
    case ZodIssueCode.invalid_date:
      return { message: "Data invalida" }
    case ZodIssueCode.not_multiple_of:
      return { message: `Deve ser multiplo de ${issue.multipleOf}` }
    case ZodIssueCode.unrecognized_keys:
      return { message: "Campos nao permitidos" }
    default:
      return { message: "Valor invalido" }
  }
}

z.setErrorMap(errorMap)
