"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Supplier } from "@/lib/schemas";
import type {
  ErpProductSupplier,
  ErpProductSuppliersResponse,
} from "@/lib/erp/types";
import { formatCpfCnpj, formatPhoneBR, onlyDigits } from "@/lib/format";
import { formatDateOnly } from "@/lib/date";
import {
  findLocalSupplierMatch,
  type SupplierMatchType,
} from "@/lib/suppliers/erp-matching";

interface ErpSupplierResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productCode?: string;
  productDescription?: string;
  localSuppliers: Supplier[];
  initialLocalSupplierId?: string;
  onResolved: (supplier: Supplier) => void;
}

type ResolveSupplierResponse = {
  created: boolean;
  supplier: Omit<Supplier, "createdAt" | "updatedAt"> & {
    createdAt?: string | Date;
    updatedAt?: string | Date;
  };
};

function normalizeSupplier(
  payload: ResolveSupplierResponse["supplier"],
): Supplier {
  return {
    ...payload,
    createdAt: payload.createdAt ? new Date(payload.createdAt) : new Date(),
    updatedAt: payload.updatedAt ? new Date(payload.updatedAt) : new Date(),
  };
}

export function ErpSupplierResolutionDialog({
  open,
  onOpenChange,
  productCode,
  productDescription,
  localSuppliers,
  initialLocalSupplierId,
  onResolved,
}: ErpSupplierResolutionDialogProps) {
  const [searchCode, setSearchCode] = useState("");
  const [resolvedProductDescription, setResolvedProductDescription] = useState<
    string | null
  >(productDescription || null);
  const [erpSuppliers, setErpSuppliers] = useState<ErpProductSupplier[]>([]);
  const [selectedErpSupplierId, setSelectedErpSupplierId] = useState("");
  const [slaDays, setSlaDays] = useState("30");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  const initialLocalSupplier = useMemo(
    () =>
      localSuppliers.find(
        (supplier) => supplier.id === initialLocalSupplierId,
      ) || null,
    [initialLocalSupplierId, localSuppliers],
  );
  const supplierMatches = useMemo(
    () =>
      new Map(
        erpSuppliers.map((supplier) => [
          supplier.id,
          findLocalSupplierMatch(localSuppliers, {
            id: supplier.id,
            name: supplier.name,
            cnpj: supplier.cnpj,
          }),
        ]),
      ),
    [erpSuppliers, localSuppliers],
  );
  const selectedErpSupplier =
    erpSuppliers.find((supplier) => supplier.id === selectedErpSupplierId) ||
    null;
  const selectedMatch = selectedErpSupplier
    ? supplierMatches.get(selectedErpSupplier.id)
    : null;
  const matchedLocalSupplier = selectedMatch?.supplier || null;
  const matchedLocalSupplierType = selectedMatch?.matchType || null;

  const resetState = () => {
    setSearchCode(productCode || "");
    setResolvedProductDescription(productDescription || null);
    setErpSuppliers([]);
    setSelectedErpSupplierId("");
    setSlaDays("30");
    setPhone("");
    setEmail("");
    setError(null);
    setIsLoading(false);
    setIsResolving(false);
  };

  const handleSearch = async (codeOverride?: string) => {
    const codeToSearch = (codeOverride || searchCode).trim();
    if (!codeToSearch) {
      setError("Informe um código de produto para consultar o ERP");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/integrations/erp/products/${encodeURIComponent(codeToSearch)}/suppliers`,
      );
      const payload = (await response.json().catch(() => null)) as
        | ErpProductSuppliersResponse
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          (payload as { error?: string } | null)?.error ||
            "Erro ao consultar fornecedores no ERP",
        );
      }

      const suppliers =
        (payload as ErpProductSuppliersResponse).suppliers || [];
      setErpSuppliers(suppliers);
      setResolvedProductDescription(
        (payload as ErpProductSuppliersResponse).productDescription || null,
      );

      const suggestedSupplierId =
        suppliers.find((supplier) => supplier.isSuggested)?.id ||
        suppliers[0]?.id ||
        "";
      const preferredSupplierId =
        suppliers.find((supplier) => {
          const match = findLocalSupplierMatch(localSuppliers, {
            id: supplier.id,
            name: supplier.name,
            cnpj: supplier.cnpj,
          });
          return match.supplier?.id === initialLocalSupplier?.id;
        })?.id || suggestedSupplierId;
      setSelectedErpSupplierId(preferredSupplierId);
    } catch (err) {
      setErpSuppliers([]);
      setSelectedErpSupplierId("");
      setResolvedProductDescription(productDescription || null);
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao consultar fornecedores no ERP",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedErpSupplier) {
      setError("Selecione um fornecedor do ERP");
      return;
    }

    const normalizedSla = Number.parseInt(slaDays, 10);
    if (
      !matchedLocalSupplier &&
      (!Number.isInteger(normalizedSla) || normalizedSla < 1)
    ) {
      setError("Informe um SLA válido");
      return;
    }

    setIsResolving(true);
    setError(null);

    try {
      const response = await fetch("/api/suppliers/resolve-from-erp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          erpSupplierId: selectedErpSupplier.id,
          name: selectedErpSupplier.name,
          cnpj: selectedErpSupplier.cnpj || undefined,
          slaDays: matchedLocalSupplier ? undefined : normalizedSla,
          phone: phone || selectedErpSupplier.phone || undefined,
          email: email || undefined,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | ResolveSupplierResponse
        | { error?: string }
        | null;
      if (!response.ok || !payload || !("supplier" in payload)) {
        throw new Error(
          (payload as { error?: string } | null)?.error ||
            "Erro ao resolver fornecedor",
        );
      }

      onResolved(normalizeSupplier(payload.supplier));
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao resolver fornecedor",
      );
    } finally {
      setIsResolving(false);
    }
  };

  useEffect(() => {
    if (!open) {
      resetState();
      return;
    }

    setSearchCode(productCode || "");
    setResolvedProductDescription(productDescription || null);
    setSlaDays(
      initialLocalSupplier?.slaDays
        ? String(initialLocalSupplier.slaDays)
        : "30",
    );
    setPhone("");
    setEmail("");
    setError(null);

    if (productCode) {
      void handleSearch(productCode);
    } else {
      setErpSuppliers([]);
      setSelectedErpSupplierId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, productCode, productDescription, initialLocalSupplier?.id]);

  useEffect(() => {
    if (!open || !selectedErpSupplier) return;
    if (matchedLocalSupplier) {
      setPhone(matchedLocalSupplier.phone || "");
      setEmail(matchedLocalSupplier.email || "");
      return;
    }

    setPhone(onlyDigits(selectedErpSupplier.phone || "").slice(0, 11));
    setEmail("");
  }, [open, selectedErpSupplier, matchedLocalSupplier]);

  function getActionLabel() {
    if (!matchedLocalSupplier) return "Criar e usar fornecedor";
    if (matchedLocalSupplierType === "erpSupplierId") return "Usar fornecedor";
    return "Vincular e usar fornecedor";
  }

  function getMatchDescription(matchType: SupplierMatchType | null) {
    if (matchType === "cnpj")
      return "Correspondência local encontrada por CNPJ. O vínculo será salvo ao confirmar.";
    if (matchType === "name")
      return "Correspondência local encontrada por nome. O vínculo será salvo ao confirmar.";
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto overscroll-contain sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Selecionar Fornecedor</DialogTitle>
          <DialogDescription>
            Busque pelo código do produto, selecione o fornecedor e o sistema
            vincula ou cria o cadastro local com SLA.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1 space-y-2">
              <Label htmlFor="erp-supplier-product-code">
                Código do produto
              </Label>
              <Input
                id="erp-supplier-product-code"
                value={searchCode}
                onChange={(event) => setSearchCode(event.target.value)}
                placeholder="Informe o código"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={() => void handleSearch()}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Buscar
                  </>
                )}
              </Button>
            </div>
          </div>

          {resolvedProductDescription && (
            <p className="text-sm text-muted-foreground">
              Produto:{" "}
              <span className="font-medium text-foreground">
                {resolvedProductDescription}
              </span>
            </p>
          )}

          <div className="space-y-2">
            <Label>Fornecedores ERP</Label>
            {erpSuppliers.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Nenhum fornecedor carregado. Busque um código para consultar.
              </div>
            ) : (
              <ScrollArea className="h-72 rounded-lg border">
                <div className="space-y-2 p-3">
                  {erpSuppliers.map((supplier) => {
                    const isSelected = supplier.id === selectedErpSupplierId;
                    const localMatch = supplierMatches.get(supplier.id);
                    const localSupplier = localMatch?.supplier;

                    return (
                      <button
                        key={supplier.id}
                        type="button"
                        onClick={() => setSelectedErpSupplierId(supplier.id)}
                        className={`w-full rounded-lg border p-3 text-left transition-colors ${
                          isSelected
                            ? "border-foreground bg-accent"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="font-medium">{supplier.name}</div>
                            <div className="flex flex-wrap gap-2">
                              {supplier.isSuggested && (
                                <Badge>Ultima compra</Badge>
                              )}
                              {supplier.hasProductLink && (
                                <Badge variant="secondary">
                                  Cadastro do produto
                                </Badge>
                              )}
                              {localSupplier && (
                                <Badge variant="outline">
                                  Cadastrado localmente{" "}
                                  {localSupplier.slaDays
                                    ? `• SLA ${localSupplier.slaDays}d`
                                    : ""}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="mt-1 h-4 w-4 shrink-0" />
                          )}
                        </div>

                        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                          {supplier.cnpj && (
                            <div>CNPJ: {formatCpfCnpj(supplier.cnpj)}</div>
                          )}
                          {supplier.phone && (
                            <div>Telefone: {formatPhoneBR(supplier.phone)}</div>
                          )}
                          {supplier.contactName && (
                            <div>Contato: {supplier.contactName}</div>
                          )}
                          {supplier.site && <div>Site: {supplier.site}</div>}
                          {supplier.lastPurchaseDate && (
                            <div>
                              Última compra:{" "}
                              {formatDateOnly(supplier.lastPurchaseDate)}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>

          {selectedErpSupplier && !matchedLocalSupplier && (
            <div className="space-y-4 rounded-lg border p-4">
              <div>
                <h3 className="font-medium">Cadastrar fornecedor local</h3>
                <p className="text-sm text-muted-foreground">
                  Este fornecedor ainda não existe no sistema. Informe o SLA
                  para criar o cadastro local e reutilizar automaticamente nas
                  próximas vezes.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="erp-supplier-sla">SLA (dias) *</Label>
                  <Input
                    id="erp-supplier-sla"
                    type="number"
                    min="1"
                    value={slaDays}
                    onChange={(event) => setSlaDays(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="erp-supplier-phone">Telefone</Label>
                  <Input
                    id="erp-supplier-phone"
                    value={formatPhoneBR(phone)}
                    onChange={(event) =>
                      setPhone(onlyDigits(event.target.value).slice(0, 11))
                    }
                    placeholder="Opcional"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="erp-supplier-email">Email</Label>
                  <Input
                    id="erp-supplier-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Opcional"
                  />
                </div>
              </div>
            </div>
          )}

          {selectedErpSupplier && matchedLocalSupplier && (
            <div className="rounded-lg border p-4 text-sm">
              <div className="font-medium">
                {matchedLocalSupplierType === "erpSupplierId"
                  ? "Fornecedor local vinculado"
                  : "Fornecedor local correspondente encontrado"}
              </div>
              <div className="mt-1 text-muted-foreground">
                {matchedLocalSupplier.name} • SLA {matchedLocalSupplier.slaDays}{" "}
                dias
              </div>
              {getMatchDescription(matchedLocalSupplierType) && (
                <div className="mt-1 text-muted-foreground">
                  {getMatchDescription(matchedLocalSupplierType)}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isResolving}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void handleResolve()}
            disabled={
              isResolving ||
              !selectedErpSupplierId ||
              (!matchedLocalSupplier && !slaDays.trim())
            }
          >
            {isResolving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              getActionLabel()
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
