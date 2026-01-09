import type { Role, Status } from "./schemas"

// Define what each role can do
export const ROLE_PERMISSIONS: Record<
  Role,
  {
    canCreateTicket: boolean
    canEditRecebimento: boolean
    canDefineSupplier: boolean
    canAdvanceFromInterno: boolean
    canRegisterLogistica: boolean
    canAttachCanhoto: boolean
    canAddTimeline: boolean
    canSetNextAction: boolean
    canResolve: boolean
    canClose: boolean
    canRevertStage: boolean
    canAccessAdmin: boolean
    canSeeAudit: boolean
    visibleStatuses: Status[]
  }
> = {
  RECEBEDOR: {
    canCreateTicket: true,
    canEditRecebimento: true,
    canDefineSupplier: false,
    canAdvanceFromInterno: false,
    canRegisterLogistica: false,
    canAttachCanhoto: false,
    canAddTimeline: true,
    canSetNextAction: false,
    canResolve: false,
    canClose: false,
    canRevertStage: false,
    canAccessAdmin: false,
    canSeeAudit: false,
    visibleStatuses: [
      "RECEBIMENTO",
      "INTERNO",
      "ENTREGA_LOGISTICA",
      "COBRANCA_ACOMPANHAMENTO",
      "RESOLUCAO",
      "ENCERRADO",
    ],
  },
  INTERNO: {
    canCreateTicket: false,
    canEditRecebimento: false,
    canDefineSupplier: true,
    canAdvanceFromInterno: true,
    canRegisterLogistica: false,
    canAttachCanhoto: false,
    canAddTimeline: true,
    canSetNextAction: false,
    canResolve: false,
    canClose: false,
    canRevertStage: false,
    canAccessAdmin: false,
    canSeeAudit: false,
    visibleStatuses: [
      "RECEBIMENTO",
      "INTERNO",
      "ENTREGA_LOGISTICA",
      "COBRANCA_ACOMPANHAMENTO",
      "RESOLUCAO",
      "ENCERRADO",
    ],
  },
  LOGISTICA: {
    canCreateTicket: false,
    canEditRecebimento: false,
    canDefineSupplier: false,
    canAdvanceFromInterno: false,
    canRegisterLogistica: true,
    canAttachCanhoto: true,
    canAddTimeline: true,
    canSetNextAction: false,
    canResolve: false,
    canClose: false,
    canRevertStage: false,
    canAccessAdmin: false,
    canSeeAudit: false,
    visibleStatuses: [
      "RECEBIMENTO",
      "INTERNO",
      "ENTREGA_LOGISTICA",
      "COBRANCA_ACOMPANHAMENTO",
      "RESOLUCAO",
      "ENCERRADO",
    ],
  },
  COBRANCA: {
    canCreateTicket: false,
    canEditRecebimento: false,
    canDefineSupplier: false,
    canAdvanceFromInterno: false,
    canRegisterLogistica: false,
    canAttachCanhoto: false,
    canAddTimeline: true,
    canSetNextAction: true,
    canResolve: true,
    canClose: true,
    canRevertStage: false,
    canAccessAdmin: false,
    canSeeAudit: false,
    visibleStatuses: [
      "RECEBIMENTO",
      "INTERNO",
      "ENTREGA_LOGISTICA",
      "COBRANCA_ACOMPANHAMENTO",
      "RESOLUCAO",
      "ENCERRADO",
    ],
  },
  ADMIN: {
    canCreateTicket: true,
    canEditRecebimento: true,
    canDefineSupplier: true,
    canAdvanceFromInterno: true,
    canRegisterLogistica: true,
    canAttachCanhoto: true,
    canAddTimeline: true,
    canSetNextAction: true,
    canResolve: true,
    canClose: true,
    canRevertStage: true,
    canAccessAdmin: true,
    canSeeAudit: true,
    visibleStatuses: [
      "RECEBIMENTO",
      "INTERNO",
      "ENTREGA_LOGISTICA",
      "COBRANCA_ACOMPANHAMENTO",
      "RESOLUCAO",
      "ENCERRADO",
    ],
  },
}

// Which roles can advance from each status
export const STATUS_ADVANCE_PERMISSIONS: Record<Status, Role[]> = {
  RECEBIMENTO: ["RECEBEDOR", "INTERNO", "ADMIN"],
  INTERNO: ["INTERNO", "ADMIN"],
  ENTREGA_LOGISTICA: ["LOGISTICA", "ADMIN"],
  COBRANCA_ACOMPANHAMENTO: ["COBRANCA", "ADMIN"],
  RESOLUCAO: ["COBRANCA", "ADMIN"],
  ENCERRADO: [], // Cannot advance from ENCERRADO
}

// Requirements for advancing stages
export const STAGE_REQUIREMENTS: Record<
  Status,
  {
    nextStatus: Status | null
    requirements: string[]
    requirementChecks: string[]
  }
> = {
  RECEBIMENTO: {
    nextStatus: "INTERNO",
    requirements: [],
    requirementChecks: [],
  },
  INTERNO: {
    nextStatus: "ENTREGA_LOGISTICA",
    requirements: ["Fornecedor deve estar definido"],
    requirementChecks: ["supplierId"],
  },
  ENTREGA_LOGISTICA: {
    nextStatus: "COBRANCA_ACOMPANHAMENTO",
    requirements: ["Anexo CANHOTO é obrigatório"],
    requirementChecks: ["hasCanhotAttachment"],
  },
  COBRANCA_ACOMPANHAMENTO: {
    nextStatus: "RESOLUCAO",
    requirements: ["Resposta do fornecedor deve ser registrada"],
    requirementChecks: ["hasSupplierResponse"],
  },
  RESOLUCAO: {
    nextStatus: "ENCERRADO",
    requirements: ["Resultado final deve ser definido"],
    requirementChecks: ["resolutionResult"],
  },
  ENCERRADO: {
    nextStatus: null,
    requirements: [],
    requirementChecks: [],
  },
}

export function canUserAdvanceStatus(role: Role, currentStatus: Status): boolean {
  return STATUS_ADVANCE_PERMISSIONS[currentStatus].includes(role)
}

export function getUserPermissions(role: Role) {
  return ROLE_PERMISSIONS[role]
}
