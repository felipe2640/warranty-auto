import { notFound } from "next/navigation"
import { requireTenantSession } from "@/lib/session"
import { listHelpDocs, normalizeHelpDocSlug, readHelpDoc } from "@/lib/docs"
import { renderMarkdownToReact } from "@/lib/markdown"
import { AppLayout } from "@/components/app-layout"
import { HelpNav } from "@/components/help/help-nav"
import { HelpNavMobile } from "@/components/help/help-nav-mobile"
import { HelpSearch } from "@/components/help/help-search"
import { Badge } from "@/components/ui/badge"

interface HelpPageProps {
  params: Promise<{ tenant: string }>
  searchParams?: Promise<{ doc?: string }>
}

export default async function HelpPage({ params, searchParams }: HelpPageProps) {
  const { tenant } = await params
  const { session, tenantName } = await requireTenantSession(tenant)
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const docParam = normalizeHelpDocSlug(resolvedSearchParams?.doc)

  const docs = await listHelpDocs()
  if (!docs.length) {
    notFound()
  }

  const activeSlug = docs.find((doc) => doc.slug === docParam)?.slug ?? docs[0].slug
  const doc = await readHelpDoc(activeSlug)

  if (!doc) {
    notFound()
  }

  const content = renderMarkdownToReact(doc.markdown)

  return (
    <AppLayout
      tenant={tenant}
      tenantName={tenantName}
      userName={session.name}
      userRole={session.role}
      breadcrumbs={[{ label: "Ajuda", href: `/t/${tenant}/help` }]}
      title="Ajuda"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Manual do usuário</p>
            <h1 className="text-2xl font-semibold">Ajuda</h1>
            <p className="text-sm text-muted-foreground">Documentação oficial do sistema.</p>
          </div>
          <HelpNavMobile tenant={tenant} docs={docs} activeSlug={activeSlug} headings={doc.headings} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
          <HelpNav tenant={tenant} docs={docs} activeSlug={activeSlug} headings={doc.headings} />

          <div id="help-content" className="space-y-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{doc.title}</h2>
                  <p className="text-sm text-muted-foreground">Atualizado automaticamente via docs/*.md</p>
                </div>
                <Badge variant="secondary">Documentação oficial</Badge>
              </div>
              <div className="mt-4">
                <HelpSearch />
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4 sm:p-6">
              <div className="space-y-6">{content}</div>
              <div
                data-help-empty
                hidden
                className="mt-6 rounded-md border border-dashed p-4 text-sm text-muted-foreground"
              >
                Nenhum resultado encontrado para a busca.
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
