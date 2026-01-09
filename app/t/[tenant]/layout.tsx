import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sistema de Garantias",
  description: "Gerenciamento de garantias e devoluções",
}

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
