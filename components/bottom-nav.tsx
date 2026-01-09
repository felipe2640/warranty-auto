"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, FileText, Calendar, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Role } from "@/lib/schemas"
import { getUserPermissions } from "@/lib/permissions"

interface BottomNavProps {
  tenant: string
  userRole: Role
}

export function BottomNav({ tenant, userRole }: BottomNavProps) {
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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
      <div className={cn("grid h-16", permissions.canAccessAdmin ? "grid-cols-4" : "grid-cols-3")}>
        {navigation.map((item) => {
          const active = isActive(item)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className={cn("h-5 w-5", active && "text-primary")} />
              <span className="font-medium">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
