"use client"

import { useState } from "react"
import Link from "next/link"
import { FileText, List, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import type { HelpNavDoc, HelpNavHeading } from "@/components/help/help-nav"

interface HelpNavMobileProps {
  tenant: string
  docs: HelpNavDoc[]
  activeSlug: string
  headings: HelpNavHeading[]
}

export function HelpNavMobile({ tenant, docs, activeSlug, headings }: HelpNavMobileProps) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="lg:hidden">
          <Menu className="mr-2 h-4 w-4" />
          Conteúdo
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Ajuda</SheetTitle>
        </SheetHeader>
        <ScrollArea className="mt-4 h-[calc(100vh-8rem)] pr-4">
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <FileText className="h-4 w-4" />
                Documentos
              </div>
              <nav className="mt-3 space-y-1">
                {docs.map((doc) => (
                  <SheetClose key={doc.slug} asChild>
                    <Link
                      href={`/t/${tenant}/help?doc=${doc.slug}`}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                        doc.slug === activeSlug
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <span className="truncate">{doc.title}</span>
                    </Link>
                  </SheetClose>
                ))}
              </nav>
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <List className="h-4 w-4" />
                Conteúdo
              </div>
              <nav className="mt-3 space-y-1">
                {headings.map((heading) => (
                  <SheetClose key={heading.id} asChild>
                    <Link
                      href={`/t/${tenant}/help?doc=${activeSlug}#${heading.id}`}
                      className={cn(
                        "block text-sm text-muted-foreground hover:text-foreground",
                        heading.level === 2 && "pl-3",
                        heading.level === 3 && "pl-5",
                      )}
                    >
                      {heading.text}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
