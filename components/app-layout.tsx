"use client"

import type { ReactNode } from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { BottomNav } from "@/components/bottom-nav"
import { Topbar } from "@/components/topbar"
import type { Role, Store } from "@/lib/schemas"

interface Breadcrumb {
  label: string
  href?: string
}

interface AppLayoutProps {
  children: ReactNode
  tenant: string
  userName: string
  userRole: Role
  userEmail?: string
  breadcrumbs?: Breadcrumb[]
  stores?: Store[]
  currentStoreId?: string
  onStoreChange?: (storeId: string) => void
  showBackButton?: boolean
  onBack?: () => void
  title?: string
  actions?: ReactNode
}

export function AppLayout({
  children,
  tenant,
  userName,
  userRole,
  userEmail,
  breadcrumbs,
  stores,
  currentStoreId,
  onStoreChange,
  showBackButton,
  onBack,
  title,
  actions,
}: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar tenant={tenant} userRole={userRole} userName={userName} userEmail={userEmail} />
      <SidebarInset>
        <Topbar
          tenant={tenant}
          userName={userName}
          userRole={userRole}
          breadcrumbs={breadcrumbs}
          stores={stores}
          currentStoreId={currentStoreId}
          onStoreChange={onStoreChange}
          showBackButton={showBackButton}
          onBack={onBack}
          title={title}
          actions={actions}
        />
        <main className="flex-1 overflow-auto pb-20 md:pb-0">{children}</main>
      </SidebarInset>
      <BottomNav tenant={tenant} userRole={userRole} />
    </SidebarProvider>
  )
}
