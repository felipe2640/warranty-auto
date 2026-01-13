import Link from "next/link"
import { FileText, List } from "lucide-react"
import { cn } from "@/lib/utils"

export interface HelpNavDoc {
  slug: string
  title: string
}

export interface HelpNavHeading {
  level: 1 | 2 | 3
  text: string
  id: string
}

interface HelpNavProps {
  tenant: string
  docs: HelpNavDoc[]
  activeSlug: string
  headings: HelpNavHeading[]
}

export function HelpNav({ tenant, docs, activeSlug, headings }: HelpNavProps) {
  return (
    <aside className="hidden lg:flex lg:flex-col lg:gap-6 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-auto">
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <FileText className="h-4 w-4" />
          Documentos
        </div>
        <nav className="mt-3 space-y-1">
          {docs.map((doc) => (
            <Link
              key={doc.slug}
              href={`/t/${tenant}/help?doc=${doc.slug}`}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                doc.slug === activeSlug ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="truncate">{doc.title}</span>
            </Link>
          ))}
        </nav>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <List className="h-4 w-4" />
          Conteúdo
        </div>
        <nav className="mt-3 space-y-1">
          {headings.map((heading) => (
            <Link
              key={heading.id}
              href={`/t/${tenant}/help?doc=${activeSlug}#${heading.id}`}
              className={cn(
                "block text-sm text-muted-foreground hover:text-foreground",
                heading.level === 2 && "pl-3",
                heading.level === 3 && "pl-5",
              )}
            >
              {heading.text}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  )
}
