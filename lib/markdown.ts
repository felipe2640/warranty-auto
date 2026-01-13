import React from "react"
import type { ReactNode } from "react"

export interface HeadingItem {
  level: 1 | 2 | 3
  text: string
  id: string
}

interface MarkdownBlockBase {
  type: string
}

interface HeadingBlock extends MarkdownBlockBase {
  type: "heading"
  level: 1 | 2 | 3
  text: string
}

interface ParagraphBlock extends MarkdownBlockBase {
  type: "paragraph"
  text: string
}

interface ListBlock extends MarkdownBlockBase {
  type: "list"
  ordered: boolean
  items: string[]
}

interface CodeBlock extends MarkdownBlockBase {
  type: "code"
  language?: string
  text: string
}

interface ImageBlock extends MarkdownBlockBase {
  type: "image"
  alt: string
  src: string
}

type MarkdownBlock = HeadingBlock | ParagraphBlock | ListBlock | CodeBlock | ImageBlock

const CODE_FENCE = "```"

function stripInlineMarkdown(text: string) {
  return text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim()
}

export function generateSlugId(text: string) {
  const base = stripInlineMarkdown(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
  return base || "section"
}

export function extractHeadings(markdown: string): HeadingItem[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n")
  const headings: HeadingItem[] = []
  const used: Record<string, number> = {}
  let inCode = false

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line.startsWith(CODE_FENCE)) {
      inCode = !inCode
      continue
    }
    if (inCode) {
      continue
    }

    const match = line.match(/^(#{1,3})\s+(.+)$/)
    if (!match) {
      continue
    }

    const level = match[1].length as 1 | 2 | 3
    const text = stripInlineMarkdown(match[2].trim())
    const base = generateSlugId(text)
    const count = (used[base] ?? 0) + 1
    used[base] = count
    const id = count > 1 ? `${base}-${count}` : base

    headings.push({ level, text, id })
  }

  return headings
}

function parseBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n")
  const blocks: MarkdownBlock[] = []
  let i = 0

  while (i < lines.length) {
    const rawLine = lines[i]
    const line = rawLine.trim()

    if (!line) {
      i += 1
      continue
    }

    if (line.startsWith(CODE_FENCE)) {
      const language = line.slice(CODE_FENCE.length).trim() || undefined
      const codeLines: string[] = []
      i += 1
      while (i < lines.length && !lines[i].trim().startsWith(CODE_FENCE)) {
        codeLines.push(lines[i])
        i += 1
      }
      i += 1
      blocks.push({ type: "code", language, text: codeLines.join("\n") })
      continue
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3
      blocks.push({ type: "heading", level, text: headingMatch[2].trim() })
      i += 1
      continue
    }

    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    if (imageMatch) {
      blocks.push({ type: "image", alt: imageMatch[1], src: imageMatch[2] })
      i += 1
      continue
    }

    const listMatch = line.match(/^([-*]|\d+\.)\s+(.+)$/)
    if (listMatch) {
      const ordered = /^\d+\./.test(listMatch[1])
      const items: string[] = []
      while (i < lines.length) {
        const listLine = lines[i].trim()
        const match = listLine.match(/^([-*]|\d+\.)\s+(.+)$/)
        if (!match || (/^\d+\./.test(match[1]) !== ordered)) {
          break
        }
        items.push(match[2].trim())
        i += 1
      }
      blocks.push({ type: "list", ordered, items })
      continue
    }

    const paragraphLines: string[] = []
    while (i < lines.length) {
      const nextLine = lines[i].trim()
      if (!nextLine) {
        break
      }
      if (
        nextLine.startsWith(CODE_FENCE) ||
        /^#{1,3}\s+/.test(nextLine) ||
        /^([-*]|\d+\.)\s+/.test(nextLine) ||
        /^!\[([^\]]*)\]\([^)]+\)$/.test(nextLine)
      ) {
        break
      }
      paragraphLines.push(nextLine)
      i += 1
    }
    blocks.push({ type: "paragraph", text: paragraphLines.join(" ") })
  }

  return blocks
}

function normalizeImageSrc(src: string) {
  if (src.startsWith("../public/")) {
    return `/${src.slice("../public/".length)}`
  }
  if (src.startsWith("public/")) {
    return `/${src.slice("public/".length)}`
  }
  if (src.startsWith("./")) {
    return src.slice(1)
  }
  return src
}

function normalizeSearchText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let remaining = text
  let index = 0

  const patterns = [
    { type: "code", regex: /`([^`]+)`/ },
    { type: "image", regex: /!\[([^\]]*)\]\(([^)]+)\)/ },
    { type: "link", regex: /\[([^\]]+)\]\(([^)]+)\)/ },
    { type: "bold", regex: /\*\*([^*]+)\*\*/ },
    { type: "italic", regex: /\*([^*]+)\*/ },
  ]

  while (remaining.length) {
    let matchIndex = -1
    let match: RegExpMatchArray | null = null
    let matchType: string | null = null

    for (const pattern of patterns) {
      const currentMatch = remaining.match(pattern.regex)
      if (currentMatch && (matchIndex === -1 || currentMatch.index! < matchIndex)) {
        matchIndex = currentMatch.index!
        match = currentMatch
        matchType = pattern.type
      }
    }

    if (!match || matchIndex === -1) {
      nodes.push(remaining)
      break
    }

    if (matchIndex > 0) {
      nodes.push(remaining.slice(0, matchIndex))
    }

    const key = `${keyPrefix}-${index}`
    index += 1

    if (matchType === "code") {
      nodes.push(
        React.createElement(
          "code",
          { key, className: "rounded bg-muted px-1 py-0.5 font-mono text-xs" },
          match[1],
        ),
      )
    } else if (matchType === "image") {
      nodes.push(
        React.createElement("img", {
          key,
          src: normalizeImageSrc(match[2]),
          alt: match[1],
          loading: "lazy",
          decoding: "async",
          className: "my-4 w-full rounded-md border object-cover",
        }),
      )
    } else if (matchType === "link") {
      const href = match[2]
      const isExternal = /^https?:\/\//.test(href)
      nodes.push(
        React.createElement(
          "a",
          {
            key,
            href,
            className: "text-primary underline underline-offset-4",
            target: isExternal ? "_blank" : undefined,
            rel: isExternal ? "noopener noreferrer" : undefined,
          },
          match[1],
        ),
      )
    } else if (matchType === "bold") {
      nodes.push(React.createElement("strong", { key, className: "font-semibold" }, match[1]))
    } else if (matchType === "italic") {
      nodes.push(React.createElement("em", { key, className: "italic" }, match[1]))
    }

    remaining = remaining.slice(matchIndex + match[0].length)
  }

  return nodes
}

function blockToPlainText(block: MarkdownBlock) {
  if (block.type === "heading" || block.type === "paragraph") {
    return stripInlineMarkdown(block.text)
  }
  if (block.type === "list") {
    return block.items.map((item) => stripInlineMarkdown(item)).join(" ")
  }
  if (block.type === "code") {
    return block.text
  }
  if (block.type === "image") {
    return block.alt
  }
  return ""
}

export function renderMarkdownToReact(markdown: string): ReactNode {
  const blocks = parseBlocks(markdown)
  const headings = extractHeadings(markdown)
  let headingIndex = 0

  const sections: Array<{
    key: string
    blocks: ReactNode[]
    searchText: string
    title?: string
  }> = []

  let current = {
    key: "intro",
    blocks: [] as ReactNode[],
    searchText: "",
    title: undefined as string | undefined,
  }

  const pushSection = () => {
    if (current.blocks.length) {
      sections.push(current)
    }
  }

  blocks.forEach((block, idx) => {
    if (block.type === "heading") {
      pushSection()
      const heading = headings[headingIndex]
      headingIndex += 1
      const id = heading?.id ?? generateSlugId(block.text)
      const tag = `h${block.level}` as keyof React.ReactHTML
      const headingClasses = {
        1: "text-2xl font-semibold tracking-tight",
        2: "text-xl font-semibold tracking-tight",
        3: "text-lg font-semibold tracking-tight",
      } as const

      current = {
        key: id,
        blocks: [
          React.createElement(
            tag,
            {
              key: `${id}-heading`,
              id,
              className: `${headingClasses[block.level]} mt-6 scroll-mt-24`,
            },
            renderInline(block.text, `${id}-heading`),
          ),
        ],
        searchText: stripInlineMarkdown(block.text),
        title: heading?.text ?? stripInlineMarkdown(block.text),
      }
      return
    }

    if (block.type === "paragraph") {
      current.blocks.push(
        React.createElement(
          "p",
          { key: `p-${idx}`, className: "text-sm leading-6 text-foreground/90" },
          renderInline(block.text, `p-${idx}`),
        ),
      )
    } else if (block.type === "list") {
      const Tag = block.ordered ? "ol" : "ul"
      current.blocks.push(
        React.createElement(
          Tag,
          {
            key: `list-${idx}`,
            className: `${block.ordered ? "list-decimal" : "list-disc"} ml-5 text-sm text-foreground/90 space-y-1`,
          },
          block.items.map((item, itemIndex) =>
            React.createElement("li", { key: `li-${idx}-${itemIndex}` }, renderInline(item, `li-${idx}-${itemIndex}`)),
          ),
        ),
      )
    } else if (block.type === "code") {
      current.blocks.push(
        React.createElement(
          "pre",
          { key: `code-${idx}`, className: "rounded-md border bg-muted p-3 text-xs overflow-auto" },
          React.createElement("code", { className: "font-mono" }, block.text),
        ),
      )
    } else if (block.type === "image") {
      current.blocks.push(
        React.createElement("img", {
          key: `img-${idx}`,
          src: normalizeImageSrc(block.src),
          alt: block.alt,
          loading: "lazy",
          decoding: "async",
          className: "my-4 w-full rounded-md border object-cover",
        }),
      )
    }

    current.searchText += ` ${blockToPlainText(block)}`
  })

  pushSection()

  return sections.map((section) =>
    React.createElement(
      "section",
      {
        key: section.key,
      "data-help-section": "true",
        "data-search": normalizeSearchText(section.searchText),
        className: "space-y-3",
      },
      section.blocks,
    ),
  )
}
