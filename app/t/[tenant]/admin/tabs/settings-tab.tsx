"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Save, CheckCircle, AlertCircle, FolderOpen, TestTube } from "lucide-react"
import type { TenantSettings } from "@/lib/schemas"

interface SettingsTabProps {
  settings: TenantSettings
  onRefresh?: () => void
}

export function SettingsTab({ settings, onRefresh }: SettingsTabProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(settings.name)
  const [driveRootFolderId, setDriveRootFolderId] = useState(settings.driveRootFolderId || "")
  const [recebedorOnlyOwnStore, setRecebedorOnlyOwnStore] = useState(settings.policies.recebedorOnlyOwnStore)
  const [requireCanhotForCobranca, setRequireCanhotForCobranca] = useState(settings.policies.requireCanhotForCobranca)
  const [allowCloseWithoutResolution, setAllowCloseWithoutResolution] = useState(
    settings.policies.allowCloseWithoutResolution,
  )
  const [defaultSlaDays, setDefaultSlaDays] = useState(String(settings.policies.defaultSlaDays || 30))

  const handleSave = async () => {
    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          driveRootFolderId: driveRootFolderId || null,
          policies: {
            recebedorOnlyOwnStore,
            requireCanhotForCobranca,
            allowCloseWithoutResolution,
            defaultSlaDays: Number.parseInt(defaultSlaDays) || 30,
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Erro ao salvar configurações")
      }

      setSuccess(true)
      onRefresh ? onRefresh() : router.refresh()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTestDrive = async () => {
    if (!driveRootFolderId) {
      setTestResult({ success: false, message: "Configure o ID da pasta primeiro" })
      return
    }

    setIsTesting(true)
    setTestResult(null)

    try {
      const response = await fetch("/api/admin/test-drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: driveRootFolderId }),
      })

      const data = await response.json()
      setTestResult({
        success: response.ok,
        message: data.message || (response.ok ? "Conexão bem sucedida!" : "Falha na conexão"),
      })
    } catch (err) {
      setTestResult({ success: false, message: "Erro ao testar conexão" })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">Configurações salvas com sucesso!</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tenant Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Tenant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Tenant</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da empresa" />
          </div>
          <div className="space-y-2">
            <Label>Slug (somente leitura)</Label>
            <Input value={settings.slug} disabled className="bg-muted" />
          </div>
        </CardContent>
      </Card>

      {/* Google Drive */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Google Drive
          </CardTitle>
          <CardDescription>Configure a integração com o Google Drive para armazenamento de arquivos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>ID da Pasta Raiz *</Label>
            <Input
              value={driveRootFolderId}
              onChange={(e) => setDriveRootFolderId(e.target.value)}
              placeholder="1ABC123..."
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              O ID pode ser encontrado na URL da pasta do Google Drive após /folders/
            </p>
          </div>

          <div className="space-y-2">
            <Label>Service Account Email (somente leitura)</Label>
            <Input value={settings.serviceAccountEmail || "Não configurado"} disabled className="bg-muted text-xs" />
            <p className="text-xs text-muted-foreground">Compartilhe a pasta do Drive com este email como Editor</p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleTestDrive} disabled={isTesting || !driveRootFolderId}>
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <TestTube className="mr-2 h-4 w-4" />
                  Testar Acesso ao Drive
                </>
              )}
            </Button>
            {testResult && (
              <span className={`text-sm ${testResult.success ? "text-green-600" : "text-destructive"}`}>
                {testResult.message}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Policies */}
      <Card>
        <CardHeader>
          <CardTitle>Políticas</CardTitle>
          <CardDescription>Configure as regras de negócio do sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Recebedor vê somente tickets da própria loja</Label>
              <p className="text-sm text-muted-foreground">
                Limita a visibilidade de tickets para usuários com papel RECEBEDOR
              </p>
            </div>
            <Switch checked={recebedorOnlyOwnStore} onCheckedChange={setRecebedorOnlyOwnStore} />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Exigir CANHOTO para avançar para cobrança</Label>
              <p className="text-sm text-muted-foreground">
                Bloqueia avanço para COBRANCA_ACOMPANHAMENTO sem anexo CANHOTO
              </p>
            </div>
            <Switch checked={requireCanhotForCobranca} onCheckedChange={setRequireCanhotForCobranca} />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Permitir encerrar sem resolução</Label>
              <p className="text-sm text-muted-foreground">Permite fechar tickets sem definir um resultado final</p>
            </div>
            <Switch checked={allowCloseWithoutResolution} onCheckedChange={setAllowCloseWithoutResolution} />
          </div>

          <div className="space-y-2">
            <Label>SLA Padrão (dias)</Label>
            <Input
              type="number"
              value={defaultSlaDays}
              onChange={(e) => setDefaultSlaDays(e.target.value)}
              min="1"
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">Prazo padrão quando o fornecedor não tem SLA específico</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSubmitting} size="lg">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
