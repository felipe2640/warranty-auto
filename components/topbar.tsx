"use client"

import type React from "react"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ChevronRight, User, LogOut, ArrowLeft } from "lucide-react"
import type { Role, Store } from "@/lib/schemas"

interface Breadcrumb {
  label: string
  href?: string
}

interface TopbarProps {
  tenant: string
  userName: string
  userRole: Role
  breadcrumbs?: Breadcrumb[]
  stores?: Store[]
  currentStoreId?: string
  onStoreChange?: (storeId: string) => void
  showBackButton?: boolean
  onBack?: () => void
  title?: string
  actions?: React.ReactNode
}

export function Topbar({
  tenant,
  userName,
  userRole,
  breadcrumbs = [],
  stores,
  currentStoreId,
  onStoreChange,
  showBackButton,
  onBack,
  title,
  actions,
}: TopbarProps) {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = `/t/${tenant}/login`
  }

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      router.back()
    }
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background px-4 lg:px-6">
      {/* Mobile: Back button or Sidebar trigger */}
      <div className="flex items-center gap-2 md:hidden">
        {showBackButton ? (
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {/* Desktop: Sidebar trigger */}
      <SidebarTrigger className="hidden md:flex -ml-1" />

      {/* Breadcrumbs (Desktop) */}
      <div className="hidden md:flex items-center gap-1 text-sm">
        <Link href={`/t/${tenant}/dashboard`} className="text-muted-foreground capitalize hover:underline">
          {tenant}
        </Link>
        {breadcrumbs.map((crumb, index) => (
          <div key={index} className="flex items-center gap-1">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            {crumb.href ? (
              <Link href={crumb.href} className="hover:underline">
                {crumb.label}
              </Link>
            ) : (
              <span className="font-medium">{crumb.label}</span>
            )}
          </div>
        ))}
      </div>

      {/* Mobile: Title */}
      {title && <h1 className="text-base font-semibold md:hidden truncate">{title}</h1>}

      <div className="flex-1" />

      {/* Store Selector */}
      {stores && stores.length > 1 && onStoreChange && (
        <Select value={currentStoreId || "all"} onValueChange={onStoreChange}>
          <SelectTrigger className="w-[140px] lg:w-[180px]">
            <SelectValue placeholder="Selecionar loja" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as lojas</SelectItem>
            {stores.map((store) => (
              <SelectItem key={store.id} value={store.id}>
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Actions */}
      {actions}

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <User className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span>{userName}</span>
              <span className="text-xs font-normal text-muted-foreground">{userRole}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
