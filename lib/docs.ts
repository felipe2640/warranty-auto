import { promises as fs } from "fs"
import path from "path"
import { extractHeadings, type HeadingItem } from "@/lib/markdown"

export interface HelpDocMeta {
  slug: string
  title: string
  filename: string
}

export interface HelpDoc extends HelpDocMeta {
  markdown: string
  headings: HeadingItem[]
}

const HELP_DOCS: HelpDocMeta[] = [
  {
    slug: "cliente-manual",
    title: "Manual do Usuário",
    filename: "CLIENTE_MANUAL.md",
  },
  {
    slug: "cliente-rapido",
    title: "Guia Rápido (1 página)",
    filename: "CLIENTE_RAPIDO_1_PAGINA.md",
  },
  {
    slug: "faq",
    title: "FAQ",
    filename: "FAQ.md",
  },
]

const DOCS_DIR = path.join(process.cwd(), "docs")

export function normalizeHelpDocSlug(value?: string | null) {
  if (!value) {
    return null
  }
  return value.trim().toLowerCase().replace(/_/g, "-")
}

export async function listHelpDocs(): Promise<HelpDocMeta[]> {
  const available: HelpDocMeta[] = []

  for (const doc of HELP_DOCS) {
    const filePath = path.join(DOCS_DIR, doc.filename)
    try {
      const markdown = await fs.readFile(filePath, "utf8")
      const headings = extractHeadings(markdown)
      const title = headings[0]?.text || doc.title
      available.push({ ...doc, title })
    } catch {
      // Ignore missing docs
    }
  }

  return available
}

export async function readHelpDoc(slug: string): Promise<HelpDoc | null> {
  const doc = HELP_DOCS.find((item) => item.slug === slug)
  if (!doc) {
    return null
  }

  const filePath = path.join(DOCS_DIR, doc.filename)
  const markdown = await fs.readFile(filePath, "utf8")
  const headings = extractHeadings(markdown)
  const title = headings[0]?.text || doc.title

  return {
    ...doc,
    title,
    markdown,
    headings,
  }
}
