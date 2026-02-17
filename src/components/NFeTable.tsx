import { NFe, tipoNotaConfig } from "@/types/nfe";
import NFeStatusBadge from "./NFeStatusBadge";
import { FileDown, Ban, FileEdit, Send, Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";

interface NFeTableProps {
  notas: NFe[];
  limit?: number;
  onCancelar?: (nota: NFe) => void;
  onCartaCorrecao?: (nota: NFe) => void;
  onReenviar?: (nota: NFe) => void;
  onExcluir?: (nota: NFe) => void;
  onBaixarXml?: (nota: NFe) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDate = (date: string) =>
  new Date(date + "T00:00:00").toLocaleDateString("pt-BR");

const NFeTable = ({ notas, limit, onCancelar, onCartaCorrecao, onReenviar, onExcluir, onBaixarXml }: NFeTableProps) => {
  const displayed = limit ? notas.slice(0, limit) : notas;

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Número</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Tipo</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Destinatário</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Valor</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
          </tr>
        </thead>
        <tbody>
          {displayed.map((nfe) => (
            <tr key={nfe.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 font-mono text-xs">{nfe.numero}</td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs">
                  {tipoNotaConfig[nfe.tipoNota]?.label || nfe.tipoNota}
                </span>
              </td>
              <td className="px-4 py-3">{formatDate(nfe.dataEmissao)}</td>
              <td className="px-4 py-3">{nfe.destinatario.razaoSocial}</td>
              <td className="px-4 py-3 font-medium hidden md:table-cell">{formatCurrency(nfe.valorTotal)}</td>
              <td className="px-4 py-3">
                <NFeStatusBadge status={nfe.status} />
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    to={`/danfe?id=${nfe.id}`}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    DANFE
                  </Link>
                  {onBaixarXml && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                          <FileDown className="h-3.5 w-3.5" />
                          XML
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onBaixarXml(nfe)}>
                          <FileDown className="mr-2 h-4 w-4" />
                          Baixar XML
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {(onCancelar || onCartaCorrecao || onReenviar) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="inline-flex items-center rounded-md px-1.5 py-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {nfe.status === "rascunho" && (
                          <DropdownMenuItem asChild>
                            <Link to={`/emitir?id=${nfe.id}`}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar Nota
                            </Link>
                          </DropdownMenuItem>
                        )}
                        {onReenviar && nfe.status === "rascunho" && (
                          <DropdownMenuItem onClick={() => onReenviar(nfe)}>
                            <Send className="mr-2 h-4 w-4" />
                            Reenviar à SEFAZ
                          </DropdownMenuItem>
                        )}
                        {onCartaCorrecao && nfe.status === "emitida" && (
                          <DropdownMenuItem onClick={() => onCartaCorrecao(nfe)}>
                            <FileEdit className="mr-2 h-4 w-4" />
                            Carta de Correção
                          </DropdownMenuItem>
                        )}
                        {onCancelar && nfe.status === "emitida" && (
                          <DropdownMenuItem
                            onClick={() => onCancelar(nfe)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Ban className="mr-2 h-4 w-4" />
                            Cancelar Nota
                          </DropdownMenuItem>
                        )}
                        {onExcluir && nfe.status === "rascunho" && (
                          <DropdownMenuItem
                            onClick={() => onExcluir(nfe)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir Nota
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default NFeTable;
