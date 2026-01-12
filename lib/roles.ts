import "./zod"
import { z } from "zod"

export const RoleEnum = z.enum(["RECEBEDOR", "INTERNO", "LOGISTICA", "COBRANCA", "ADMIN"])
export type Role = z.infer<typeof RoleEnum>

export const ADMIN_ROLE: Role = "ADMIN"
