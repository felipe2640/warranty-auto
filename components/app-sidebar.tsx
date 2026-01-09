"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { LayoutDashboard, FileText, Calendar, Settings, LogOut, Shield } from "lucide-react"
import type { Role } from "@/lib/schemas"
import { getUserPermissions } from "@/lib/permissions"

interface AppSidebarProps {
  tenant: string
  userRole: Role
  userName?: string
  userEmail?: string
}

export function AppSidebar({ tenant, userRole, userName, userEmail }: AppSidebarProps) {
  const pathname = usePathname()
  const permissions = getUserPermissions(userRole)

  const navigation = [
    {
      name: "Dashboard",
      href: `/t/${tenant}`,
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: "Garantias",
      href: `/t/${tenant}/warranty`,
      icon: FileText,
    },
    {
      name: "Agenda",
      href: `/t/${tenant}/agenda`,
      icon: Calendar,
    },
  ]

  if (permissions.canAccessAdmin) {
    navigation.push({
      name: "Admin",
      href: `/t/${tenant}/admin`,
      icon: Settings,
    })
  }

  const isActive = (item: (typeof navigation)[0]) => {
    if (item.exact) {
      return pathname === item.href
    }
    return pathname.startsWith(item.href)
  }

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = `/t/${tenant}/login`
  }

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Shield className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Sistema Garantias</span>
            <span className="text-xs text-muted-foreground capitalize">{tenant}</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild isActive={isActive(item)}>
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{userName || "Usuário"}</p>
            <p className="truncate text-xs text-muted-foreground">{userRole}</p>
          </div>
          <button onClick={handleLogout} className="rounded-md p-2 hover:bg-muted transition-colors" title="Sair">
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
