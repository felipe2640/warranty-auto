"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { Ticket } from "@/lib/schemas"
import { Phone, Calendar, Package, User, Store } from "lucide-react"
import { formatCpfCnpj, formatDateBR, formatPhoneBR } from "@/lib/format"
import { diffDaysDateOnly, formatDateOnly, todayDateOnly } from "@/lib/date"

interface TicketSummaryTabProps {
  ticket: Ticket & { storeName: string }
  canSetNextAction: boolean
  canDefineSupplier: boolean
  onSetSupplier: () => void
}

export function TicketSummaryTab({ ticket, canDefineSupplier, onSetSupplier }: TicketSummaryTabProps) {
  const getDaysOverdue = () => {
    if (!ticket.dueDate || ticket.status === "ENCERRADO") return null
    const diffDays = diffDaysDateOnly(ticket.dueDate, todayDateOnly())
    return diffDays > 0 ? diffDays : null
  }

  const daysOverdue = getDaysOverdue()

  return (
    <div className="space-y-4">
      {/* Cliente Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nome</span>
            <span className="font-medium text-foreground">{ticket.nomeRazaoSocial}</span>
          </div>
          {ticket.nomeFantasiaApelido && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fantasia</span>
              <span className="text-foreground">{ticket.nomeFantasiaApelido}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">CPF/CNPJ</span>
            <span className="text-foreground">{formatCpfCnpj(ticket.cpfCnpj)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Celular</span>
            <a
              href={ticket.isWhatsapp ? `https://wa.me/55${ticket.celular}` : `tel:${ticket.celular}`}
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <Phone className="h-3 w-3" />
              {formatPhoneBR(ticket.celular)}
              {ticket.isWhatsapp && <span className="text-xs">(WhatsApp)</span>}
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Peça Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Peça
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Descrição</span>
            <p className="font-medium text-foreground">{ticket.descricaoPeca}</p>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Quantidade</span>
            <span className="text-foreground">{ticket.quantidade}</span>
          </div>
          {ticket.ref && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Referência</span>
              <span className="text-foreground">{ticket.ref}</span>
            </div>
          )}
          {ticket.codigo && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Código</span>
              <span className="text-foreground">{ticket.codigo}</span>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Defeito</span>
            <p className="text-foreground">{ticket.defeitoPeca}</p>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nº Venda/CFe</span>
            <span className="text-foreground">{ticket.numeroVendaOuCfe}</span>
          </div>
          {ticket.numeroVendaOuCfeFornecedor && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nº Fornecedor</span>
              <span className="text-foreground">{ticket.numeroVendaOuCfeFornecedor}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loja & Fornecedor Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Store className="h-4 w-4" />
            Loja e Fornecedor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Loja</span>
            <span className="text-foreground">{ticket.storeName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Fornecedor</span>
            {ticket.supplierName && ticket.supplierName !== "—" ? (
              <span className="text-foreground">{ticket.supplierName}</span>
            ) : canDefineSupplier ? (
              <Button size="sm" variant="outline" onClick={onSetSupplier}>
                Definir fornecedor
              </Button>
            ) : (
              <span className="text-muted-foreground">Não definido</span>
            )}
          </div>
          {ticket.slaDays && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">SLA</span>
              <span className="text-foreground">{ticket.slaDays} dias</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Datas & Prazos Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Datas e Prazos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Data da Venda</span>
            <span className="text-foreground">{formatDateOnly(ticket.dataVenda)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Recebimento da Peça</span>
            <span className="text-foreground">{formatDateOnly(ticket.dataRecebendoPeca)}</span>
          </div>
          {ticket.dataIndoFornecedor && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Envio ao Fornecedor</span>
              <span className="text-foreground">{formatDateOnly(ticket.dataIndoFornecedor)}</span>
            </div>
          )}
          {ticket.deliveredToSupplierAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Entregue ao Fornecedor</span>
              <span className="text-foreground">{formatDateBR(ticket.deliveredToSupplierAt)}</span>
            </div>
          )}
          {ticket.dueDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prazo</span>
              <span className={daysOverdue ? "text-destructive font-medium" : "text-foreground"}>
                {formatDateOnly(ticket.dueDate)}
                {daysOverdue && ` (${daysOverdue}d atraso)`}
              </span>
            </div>
          )}
          {ticket.nextActionAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Próxima Ação</span>
              <span className="text-foreground">{formatDateOnly(ticket.nextActionAt)}</span>
            </div>
          )}
          {ticket.nextActionNote && (
            <div>
              <span className="text-muted-foreground">Nota da Ação</span>
              <p className="text-foreground">{ticket.nextActionNote}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Observações Card */}
      {ticket.obs && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground whitespace-pre-wrap">{ticket.obs}</p>
          </CardContent>
        </Card>
      )}

      {/* Resolução Card */}
      {ticket.resolutionResult && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resolução</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Resultado</span>
              <span className="font-medium text-foreground">{ticket.resolutionResult}</span>
            </div>
            {ticket.resolutionNotes && (
              <div>
                <span className="text-muted-foreground">Notas</span>
                <p className="text-foreground">{ticket.resolutionNotes}</p>
              </div>
            )}
            {ticket.closedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Encerrado em</span>
                <span className="text-foreground">{formatDateBR(ticket.closedAt)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
