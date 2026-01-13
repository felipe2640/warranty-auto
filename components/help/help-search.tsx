"use client"

import { useEffect, useState } from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface HelpSearchProps {
  targetId?: string
  placeholder?: string
}

export function HelpSearch({ targetId = "help-content", placeholder = "Buscar neste documento" }: HelpSearchProps) {
  const [query, setQuery] = useState("")

  const normalizeQuery = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")

  useEffect(() => {
    const handle = setTimeout(() => {
      const container = document.getElementById(targetId)
      if (!container) {
        return
      }
      const sections = Array.from(container.querySelectorAll<HTMLElement>("[data-help-section]"))
      const normalized = normalizeQuery(query)
      let visibleCount = 0

      sections.forEach((section) => {
        const haystack = section.dataset.search || ""
        const isMatch = !normalized || haystack.includes(normalized)
        section.hidden = !isMatch
        if (isMatch) {
          visibleCount += 1
        }
      })

      const emptyState = container.querySelector<HTMLElement>("[data-help-empty]")
      if (emptyState) {
        emptyState.hidden = visibleCount > 0
      }
    }, 200)

    return () => clearTimeout(handle)
  }, [query, targetId])

  const clearQuery = () => setQuery("")

  return (
    <div className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-10"
      />
      {query ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={clearQuery}
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  )
}
