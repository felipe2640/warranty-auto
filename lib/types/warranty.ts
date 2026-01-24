import type { Attachment, Status } from "@/lib/schemas"

export interface TransitionChecklistItem {
  key: "supplierId" | "canhoto" | "supplierResponse" | "resolutionResult" | "nfFields"
  label: string
  satisfied: boolean
  cta?: {
    type: "supplier" | "attachment" | "supplierResponse" | "resolution" | "editInternal"
    label: string
  }
}

export interface NextTransitionChecklist {
  nextStatus: Status | null
  canAdvance: boolean
  items: TransitionChecklistItem[]
}

export interface StageSummary {
  status: Status
  at?: Date
  byName?: string
  lastNote?: string
  attachmentsPreview: Array<Pick<Attachment, "id" | "name" | "category" | "driveFileId" | "uploadedAt">>
}
