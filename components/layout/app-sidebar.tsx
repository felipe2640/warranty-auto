"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, FileText, Calendar, Settings, LogOut, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import type { Role } from "@/lib/schemas"
import { getUserPermissions } from "@/lib/permissions"
import { useState } from "react"

interface AppSidebarProps {
  tenant: string
  user: {
    name: string
    email: string
    role: Role
  }
}

export function AppSidebar({ tenant, user }: AppSidebarProps) {
  const pathname = usePathname()
  const permissions = getUserPermissions(user.role)
  const [open, setOpen] = useState(false)

  const navItems = [
    { href: `/t/${tenant}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
    { href: `/t/${tenant}/warranty`, label: "Garantias", icon: FileText },
    { href: `/t/${tenant}/agenda`, label: "Agenda", icon: Calendar },
  ]

  if (permissions.canAccessAdmin) {
    navItems.push({ href: `/t/${tenant}/admin`, label: "Admin", icon: Settings })
  }

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = `/t/${tenant}/login`
  }

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-lg text-foreground">Garantias</h2>
        <p className="text-sm text-muted-foreground">{tenant}</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="mb-3">
          <p className="text-sm font-medium text-foreground">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.role}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout} className="w-full justify-start bg-transparent">
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-sidebar border-r border-sidebar-border">
        <NavContent />
      </aside>

      {/* Mobile Header with Menu */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <h1 className="font-semibold text-foreground">Garantias</h1>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
              <NavContent />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </>
  )
}
