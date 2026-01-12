import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { getAdminDb } from "@/lib/firebase/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

type SearchParams = {
  tenant?: string | string[]
}

function getTenantParam(searchParams?: SearchParams) {
  const raw = searchParams?.tenant
  if (Array.isArray(raw)) {
    return raw[0]?.trim()
  }
  return raw?.trim()
}

async function resolveTenantSlugById(tenantId: string) {
  const doc = await getAdminDb().collection("tenants").doc(tenantId).get()
  const data = doc.data()
  return typeof data?.slug === "string" ? data.slug : null
}

async function resolveSingleTenantSlug() {
  const snapshot = await getAdminDb().collection("tenants").limit(2).get()
  if (snapshot.size !== 1) return null
  const data = snapshot.docs[0].data()
  return typeof data?.slug === "string" ? data.slug : null
}

export default async function Home({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const session = await getSession()
  if (session) {
    const slug = await resolveTenantSlugById(session.tenantId)
    if (slug) {
      redirect(`/t/${encodeURIComponent(slug)}/dashboard`)
    }
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const tenantParam = getTenantParam(resolvedSearchParams)
  if (tenantParam) {
    redirect(`/t/${encodeURIComponent(tenantParam)}/login`)
  }

  const singleTenantSlug = await resolveSingleTenantSlug()
  if (singleTenantSlug) {
    redirect(`/t/${encodeURIComponent(singleTenantSlug)}/login`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-2 flex justify-center">
            <img src="/insight_logo_resized.png" alt="Logo Insight" className="h-12 w-auto" />
          </div>
          <CardTitle className="text-2xl">Entrar</CardTitle>
          <CardDescription>Informe o slug do tenant para acessar</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" action="/" method="GET">
            <div className="space-y-2">
              <div className="text-sm font-medium">Slug do tenant</div>
              <Input id="tenant" name="tenant" placeholder="minha-loja" required autoComplete="off" />
              <p className="text-xs text-muted-foreground">
                Use o mesmo slug definido no tenant. No primeiro acesso, ele sera criado apos o login.
              </p>
            </div>
            <Button type="submit" className="w-full">
              Continuar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
