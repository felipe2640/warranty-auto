import { redirect } from "next/navigation"

interface AjudaPageProps {
  params: Promise<{ tenant: string }>
}

export default async function AjudaPage({ params }: AjudaPageProps) {
  const { tenant } = await params
  redirect(`/t/${tenant}/help`)
}
