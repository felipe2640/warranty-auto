import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/session"
import { adminDb } from "@/lib/firebase/admin"
import { AdminClient } from "./admin-client"
import { listUsers, listStores, listSuppliers } from "@/lib/repositories/admin"
import type { TenantSettings } from "@/lib/schemas"

export default async function AdminPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params
  const session = await requireAuth()

  if (session.tenantId !== tenant) {
    redirect("/login")
  }

  // Only ADMIN can access admin panel
  if (session.role !== "ADMIN") {
    redirect(`/t/${tenant}`)
  }

  // Fetch all data in parallel
  const [users, stores, suppliers, settingsDoc, ticketsCount] = await Promise.all([
    listUsers(session.tenantId),
    listStores(session.tenantId),
    listSuppliers(session.tenantId),
    adminDb.collection("tenants").doc(session.tenantId).get(),
    adminDb
      .collection("tickets")
      .where("tenantId", "==", session.tenantId)
      .where("status", "!=", "ENCERRADO")
      .count()
      .get(),
  ])

  const settingsData = settingsDoc.exists ? settingsDoc.data() : {}
  const settings: TenantSettings = {
    id: session.tenantId,
    slug: tenant,
    name: settingsData?.name || tenant,
    driveRootFolderId: settingsData?.driveRootFolderId,
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    policies: {
      recebedorOnlyOwnStore: settingsData?.policies?.recebedorOnlyOwnStore ?? true,
      requireCanhotForCobranca: settingsData?.policies?.requireCanhotForCobranca ?? true,
      allowCloseWithoutResolution: settingsData?.policies?.allowCloseWithoutResolution ?? false,
      defaultSlaDays: settingsData?.policies?.defaultSlaDays ?? 30,
    },
    createdAt: settingsData?.createdAt?.toDate?.() || new Date(),
    updatedAt: settingsData?.updatedAt?.toDate?.() || new Date(),
  }

  return (
    <AdminClient
      users={users}
      stores={stores}
      suppliers={suppliers}
      settings={settings}
      openTicketsCount={ticketsCount.data().count}
      tenant={tenant}
      userName={session.name}
      userRole={session.role}
    />
  )
}
