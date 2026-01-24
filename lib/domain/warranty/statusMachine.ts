import type { Role } from "@/lib/roles"
import { ResolutionResultEnum, type Status, type Ticket } from "@/lib/schemas"

export interface TransitionContext {
  role: Role
}

export interface TransitionInput {
  supplierId?: string
  resolutionResult?: string
  supplierResponse?: string
}

export interface TransitionChecks {
  hasCanhoto: boolean
}

export interface TransitionError {
  code: "FORBIDDEN" | "INVALID_TRANSITION" | "MISSING_REQUIREMENT"
  message: string
  missing?: string
}

export const allowedTransitions: Record<Status, Status | null> = {
  RECEBIMENTO: "INTERNO",
  INTERNO: "ENTREGA_LOGISTICA",
  ENTREGA_LOGISTICA: "COBRANCA_ACOMPANHAMENTO",
  COBRANCA_ACOMPANHAMENTO: "RESOLUCAO",
  RESOLUCAO: "ENCERRADO",
  ENCERRADO: null,
}

export const transitionRoles: Record<Status, Role[]> = {
  RECEBIMENTO: ["INTERNO", "ADMIN"],
  INTERNO: ["INTERNO", "ADMIN"],
  ENTREGA_LOGISTICA: ["LOGISTICA", "ADMIN"],
  COBRANCA_ACOMPANHAMENTO: ["COBRANCA", "ADMIN"],
  RESOLUCAO: ["COBRANCA", "ADMIN"],
  ENCERRADO: [],
}

export function validateTransition(
  ticket: Ticket,
  ctx: TransitionContext,
  input: TransitionInput,
  checks: TransitionChecks,
): TransitionError | null {
  const nextStatus = allowedTransitions[ticket.status]
  if (!nextStatus) {
    return { code: "INVALID_TRANSITION", message: "Não é possível avançar a partir deste status" }
  }

  const allowedRoles = transitionRoles[ticket.status]
  if (!allowedRoles.includes(ctx.role)) {
    return { code: "FORBIDDEN", message: "Permissão insuficiente para avançar este status" }
  }

  if (ticket.status === "INTERNO" && !ticket.supplierId && !input.supplierId) {
    return { code: "MISSING_REQUIREMENT", message: "Fornecedor deve estar definido", missing: "supplierId" }
  }

  if (ticket.status === "INTERNO") {
    const nfOk = Boolean(ticket.nfIda && ticket.dataIndoFornecedor)
    if (!nfOk) {
      return {
        code: "MISSING_REQUIREMENT",
        message: "NF Ida e data de ida ao fornecedor são obrigatórias no Interno",
        missing: "nfFields",
      }
    }
  }

  if (ticket.status === "ENTREGA_LOGISTICA" && !checks.hasCanhoto) {
    return { code: "MISSING_REQUIREMENT", message: "Anexo CANHOTO é obrigatório", missing: "canhoto" }
  }

  if (ticket.status === "COBRANCA_ACOMPANHAMENTO" && !input.supplierResponse) {
    return { code: "MISSING_REQUIREMENT", message: "Resposta do fornecedor é obrigatória", missing: "supplierResponse" }
  }

  if (ticket.status === "RESOLUCAO") {
    if (!input.resolutionResult) {
      return { code: "MISSING_REQUIREMENT", message: "Resultado final deve ser definido", missing: "resolution" }
    }

    const resolutionValidation = ResolutionResultEnum.safeParse(input.resolutionResult)
    if (!resolutionValidation.success) {
      return {
        code: "MISSING_REQUIREMENT",
        message: "Resultado final deve ser Crédito, Troca ou Negou",
        missing: "resolution",
      }
    }
  }

  return null
}
