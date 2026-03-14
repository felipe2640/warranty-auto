import { onlyDigits } from "@/lib/format"
import type { Supplier } from "@/lib/schemas"

export interface ErpSupplierIdentity {
  id?: string | null
  name?: string | null
  cnpj?: string | null
  phone?: string | null
  email?: string | null
}

export type SupplierMatchType = "erpSupplierId" | "cnpj" | "name"

export interface SupplierMatchResult {
  supplier: Supplier | null
  matchType: SupplierMatchType | null
}

export function normalizeSupplierName(value?: string | null) {
  if (!value) return ""

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
}

function sortSupplierCandidates(localSuppliers: Supplier[]) {
  return [...localSuppliers].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

export function findLocalSupplierMatch(
  localSuppliers: Supplier[],
  erpSupplier: ErpSupplierIdentity,
): SupplierMatchResult {
  const suppliers = sortSupplierCandidates(localSuppliers)
  const erpSupplierId = erpSupplier.id?.trim() || ""

  if (erpSupplierId) {
    const exactMatch = suppliers.find((supplier) => supplier.erpSupplierId === erpSupplierId) || null
    if (exactMatch) {
      return { supplier: exactMatch, matchType: "erpSupplierId" }
    }
  }

  const normalizedCnpj = onlyDigits(erpSupplier.cnpj || "").slice(0, 14)
  if (normalizedCnpj) {
    const cnpjMatch =
      suppliers.find((supplier) => {
        const supplierCnpj = onlyDigits(supplier.cnpj || "").slice(0, 14)
        if (!supplierCnpj || supplierCnpj !== normalizedCnpj) return false
        return !supplier.erpSupplierId || supplier.erpSupplierId === erpSupplierId
      }) || null

    if (cnpjMatch) {
      return { supplier: cnpjMatch, matchType: "cnpj" }
    }
  }

  const normalizedName = normalizeSupplierName(erpSupplier.name)
  if (normalizedName) {
    const nameMatch =
      suppliers.find((supplier) => {
        if (normalizeSupplierName(supplier.name) !== normalizedName) return false
        if (supplier.erpSupplierId && supplier.erpSupplierId !== erpSupplierId) return false

        if (normalizedCnpj) {
          const supplierCnpj = onlyDigits(supplier.cnpj || "").slice(0, 14)
          if (supplierCnpj && supplierCnpj !== normalizedCnpj) return false
        }

        return true
      }) || null

    if (nameMatch) {
      return { supplier: nameMatch, matchType: "name" }
    }
  }

  return { supplier: null, matchType: null }
}

export function buildSupplierErpSyncPatch(
  localSupplier: Supplier,
  erpSupplier: ErpSupplierIdentity,
): Partial<Supplier> {
  const patch: Partial<Supplier> = {}
  const erpSupplierId = erpSupplier.id?.trim() || undefined
  const cnpj = onlyDigits(erpSupplier.cnpj || "").slice(0, 14) || undefined
  const phone = onlyDigits(erpSupplier.phone || "").slice(0, 11) || undefined
  const email = erpSupplier.email?.trim() || undefined

  if (erpSupplierId && localSupplier.erpSupplierId !== erpSupplierId) {
    patch.erpSupplierId = erpSupplierId
  }

  if (cnpj && !localSupplier.cnpj) {
    patch.cnpj = cnpj
  }

  if (phone && !localSupplier.phone) {
    patch.phone = phone
  }

  if (email && !localSupplier.email) {
    patch.email = email
  }

  if (!localSupplier.active) {
    patch.active = true
  }

  return patch
}
