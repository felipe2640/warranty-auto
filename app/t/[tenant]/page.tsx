import { redirect } from "next/navigation"

export default async function TenantRootPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params
  redirect(`/t/${tenant}/dashboard`)
}
