import React, { forwardRef } from "react";
import type { NFeData } from "@/lib/generateNFeXml";

interface DanfePreviewProps {
  nfeData: NFeData;
  protocolo?: string;
  chaveAcesso?: string;
  numero?: string;
  serie?: string;
}

const DanfePreview = forwardRef<HTMLDivElement, DanfePreviewProps>(
  ({ nfeData, protocolo, chaveAcesso, numero, serie }, ref) => {
    const formatMoney = (value: number) =>
      (value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const formatDate = (iso?: string) => {
      if (!iso) return "";
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleDateString("pt-BR");
    };

    return (
      <div
        ref={ref}
        className="mx-auto bg-white text-black font-sans print:shadow-none relative danfe-root"
        style={{
          width: "210mm",
          height: "297mm",
          padding: "6mm",
          boxSizing: "border-box",
          fontSize: "9px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <style>{`
          @page { size: A4; margin: 0; }
          html, body { width: 210mm; height: 297mm; }
          .danfe-root { background: #fff; }

          /* fluxo vertical para permitir "esticar" o DANFE até o final da folha */
          .danfe-flow { flex: 1 1 auto; display: flex; flex-direction: column; min-height: 0; }

          /* este é o “preenchedor” de espaço */
          .danfe-spacer { flex: 1 1 auto; min-height: 0; }

          /* evita quebra estranha em impressão */
          .danfe-avoid-break { break-inside: avoid; page-break-inside: avoid; }

          @media print {
            body { margin: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        `}</style>

        {/* Marca d’água CANCELADA (se aplicável) */}
        {nfeData?.cancelada ? (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ opacity: 0.15, zIndex: 10 }}
          >
            <div style={{ transform: "rotate(-20deg)", fontSize: "64px", fontWeight: 800 }}>
              CANCELADA
            </div>
          </div>
        ) : null}

        <div className="danfe-flow">
          {/* ===== CANHOTO ===== */}
          <div
            data-pdf-section
            className="border border-black p-1 danfe-avoid-break"
            style={{ marginBottom: "2mm" }}
          >
            <div className="flex justify-between text-[8px]">
              <div className="flex-1 pr-2">
                RECEBEMOS DE <b>{nfeData.emit?.xNome}</b> OS PRODUTOS / SERVIÇOS CONSTANTES DA NOTA FISCAL INDICADA
                AO LADO. DEST.: <b>{nfeData.dest?.xNome}</b> – VALOR TOTAL:{" "}
                <b>R$ {formatMoney(nfeData.total?.vNF ?? 0)}</b>
              </div>
              <div className="w-[22mm] text-right">
                <div>
                  <b>NF-e</b>
                </div>
                <div>
                  Nº <b>{numero ?? nfeData.ide?.nNF}</b>
                </div>
                <div>
                  SÉRIE <b>{serie ?? nfeData.ide?.serie}</b>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="border border-black h-[8mm] flex items-end p-1 text-[7px]">
                DATA DO RECEBIMENTO
              </div>
              <div className="border border-black h-[8mm] flex items-end p-1 text-[7px]">
                IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR
              </div>
            </div>
          </div>

          {/* ===== CABEÇALHO DANFE ===== */}
          <div data-pdf-section className="border border-black danfe-avoid-break" style={{ marginBottom: "2mm" }}>
            <div className="grid grid-cols-12">
              <div className="col-span-5 border-r border-black p-2">
                <div className="text-[8px] font-bold">IDENTIFICAÇÃO DO EMITENTE</div>
                <div className="mt-1">
                  <div className="text-[11px] font-bold">{nfeData.emit?.xNome}</div>
                  <div className="text-[8px]">
                    {nfeData.emit?.enderEmit?.xLgr}, {nfeData.emit?.enderEmit?.nro}
                  </div>
                  <div className="text-[8px]">
                    {nfeData.emit?.enderEmit?.xMun} - {nfeData.emit?.enderEmit?.UF} CEP:{" "}
                    {nfeData.emit?.enderEmit?.CEP}
                  </div>
                </div>
              </div>

              <div className="col-span-3 border-r border-black p-2 text-center">
                <div className="font-bold text-[12px]">DANFE</div>
                <div className="text-[7px] leading-tight">
                  DOCUMENTO AUXILIAR DA
                  <br />
                  NOTA FISCAL ELETRÔNICA
                </div>
                <div className="mt-2 border border-black inline-block px-2 py-1 text-[10px] font-bold">
                  {nfeData.ide?.tpNF === "0" ? "0 - ENTRADA" : "1 - SAÍDA"}
                </div>
                <div className="mt-2 text-[8px]">
                  Nº <b>{numero ?? nfeData.ide?.nNF}</b> fl. 1/1
                </div>
                <div className="text-[8px]">
                  SÉRIE <b>{serie ?? nfeData.ide?.serie}</b>
                </div>
              </div>

              <div className="col-span-4 p-2">
                <div className="border border-black p-1 text-center text-[7px]">
                  <div className="font-bold">CHAVE DE ACESSO</div>
                  <div className="mt-1 text-[8px] font-mono break-all">{chaveAcesso ?? nfeData.chave}</div>
                  <div className="mt-1">Consulta de autenticidade no portal nacional da NF-e</div>
                </div>

                <div className="border border-black p-1 mt-1 text-center text-[7px]">
                  <div className="font-bold">PROTOCOLO DE AUTORIZAÇÃO DE USO</div>
                  <div className="text-[8px]">{protocolo ?? nfeData.protocolo ?? ""}</div>
                  <div className="text-[8px]">{nfeData.dhRecbto ? formatDate(nfeData.dhRecbto) : ""}</div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== NATUREZA / IE / CNPJ ===== */}
          <div data-pdf-section className="border border-black danfe-avoid-break" style={{ marginBottom: "2mm" }}>
            <div className="grid grid-cols-12">
              <div className="col-span-6 border-r border-black p-1">
                <div className="text-[7px]">NATUREZA DA OPERAÇÃO</div>
                <div className="text-[9px] font-bold">{nfeData.ide?.natOp}</div>
              </div>
              <div className="col-span-3 border-r border-black p-1">
                <div className="text-[7px]">CNPJ / CPF</div>
                <div className="text-[9px] font-bold">{nfeData.emit?.CNPJ ?? nfeData.emit?.CPF}</div>
              </div>
              <div className="col-span-3 p-1">
                <div className="text-[7px]">INSCRIÇÃO ESTADUAL</div>
                <div className="text-[9px] font-bold">{nfeData.emit?.IE}</div>
              </div>
            </div>
          </div>

          {/* ===== DESTINATÁRIO ===== */}
          <div data-pdf-section className="border border-black danfe-avoid-break" style={{ marginBottom: "2mm" }}>
            <div className="p-1 text-[7px] font-bold border-b border-black">DESTINATÁRIO / REMETENTE</div>
            <div className="grid grid-cols-12">
              <div className="col-span-7 border-r border-black p-1">
                <div className="text-[7px]">NOME / RAZÃO SOCIAL</div>
                <div className="text-[9px] font-bold">{nfeData.dest?.xNome}</div>
              </div>
              <div className="col-span-3 border-r border-black p-1">
                <div className="text-[7px]">CNPJ / CPF</div>
                <div className="text-[9px] font-bold">{nfeData.dest?.CNPJ ?? nfeData.dest?.CPF}</div>
              </div>
              <div className="col-span-2 p-1">
                <div className="text-[7px]">DATA DA EMISSÃO</div>
                <div className="text-[9px] font-bold">{formatDate(nfeData.ide?.dhEmi)}</div>
              </div>
            </div>
            <div className="grid grid-cols-12 border-t border-black">
              <div className="col-span-6 border-r border-black p-1">
                <div className="text-[7px]">ENDEREÇO</div>
                <div className="text-[8px]">
                  {nfeData.dest?.enderDest?.xLgr}, {nfeData.dest?.enderDest?.nro} – {nfeData.dest?.enderDest?.xBairro}
                </div>
              </div>
              <div className="col-span-2 border-r border-black p-1">
                <div className="text-[7px]">MUNICÍPIO</div>
                <div className="text-[8px]">{nfeData.dest?.enderDest?.xMun}</div>
              </div>
              <div className="col-span-1 border-r border-black p-1">
                <div className="text-[7px]">UF</div>
                <div className="text-[8px]">{nfeData.dest?.enderDest?.UF}</div>
              </div>
              <div className="col-span-3 p-1">
                <div className="text-[7px]">INSCRIÇÃO ESTADUAL</div>
                <div className="text-[8px]">{nfeData.dest?.IE}</div>
              </div>
            </div>
          </div>

          {/* ===== TOTAIS (resumo) ===== */}
          <div data-pdf-section className="border border-black danfe-avoid-break" style={{ marginBottom: "2mm" }}>
            <div className="grid grid-cols-12">
              <div className="col-span-3 border-r border-black p-1">
                <div className="text-[7px]">BASE CÁLC. ICMS</div>
                <div className="text-[9px] font-bold">{formatMoney(nfeData.total?.vBC ?? 0)}</div>
              </div>
              <div className="col-span-2 border-r border-black p-1">
                <div className="text-[7px]">VALOR ICMS</div>
                <div className="text-[9px] font-bold">{formatMoney(nfeData.total?.vICMS ?? 0)}</div>
              </div>
              <div className="col-span-3 border-r border-black p-1">
                <div className="text-[7px]">BASE ICMS ST</div>
                <div className="text-[9px] font-bold">{formatMoney(nfeData.total?.vBCST ?? 0)}</div>
              </div>
              <div className="col-span-2 border-r border-black p-1">
                <div className="text-[7px]">VALOR ST</div>
                <div className="text-[9px] font-bold">{formatMoney(nfeData.total?.vST ?? 0)}</div>
              </div>
              <div className="col-span-2 p-1">
                <div className="text-[7px]">VLR PRODUTOS</div>
                <div className="text-[9px] font-bold">{formatMoney(nfeData.total?.vProd ?? 0)}</div>
              </div>
            </div>

            <div className="grid grid-cols-12 border-t border-black">
              <div className="col-span-3 border-r border-black p-1">
                <div className="text-[7px]">FRETE</div>
                <div className="text-[9px] font-bold">{formatMoney(nfeData.total?.vFrete ?? 0)}</div>
              </div>
              <div className="col-span-3 border-r border-black p-1">
                <div className="text-[7px]">SEGURO</div>
                <div className="text-[9px] font-bold">{formatMoney(nfeData.total?.vSeg ?? 0)}</div>
              </div>
              <div className="col-span-2 border-r border-black p-1">
                <div className="text-[7px]">DESCONTO</div>
                <div className="text-[9px] font-bold">{formatMoney(nfeData.total?.vDesc ?? 0)}</div>
              </div>
              <div className="col-span-2 border-r border-black p-1">
                <div className="text-[7px]">OUTROS</div>
                <div className="text-[9px] font-bold">{formatMoney(nfeData.total?.vOutro ?? 0)}</div>
              </div>
              <div className="col-span-2 p-1">
                <div className="text-[7px]">VALOR TOTAL DA NOTA</div>
                <div className="text-[9px] font-bold">{formatMoney(nfeData.total?.vNF ?? 0)}</div>
              </div>
            </div>
          </div>

          {/* ===== ITENS ===== */}
          <div data-pdf-section className="border border-black danfe-avoid-break" style={{ marginBottom: "2mm" }}>
            <div className="p-1 text-[7px] font-bold border-b border-black">DADOS DO PRODUTO / SERVIÇO</div>
            <table className="w-full text-[7px]" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th className="border border-black p-1">CÓD.</th>
                  <th className="border border-black p-1 text-left">DESCRIÇÃO</th>
                  <th className="border border-black p-1">NCM/SH</th>
                  <th className="border border-black p-1">CFOP</th>
                  <th className="border border-black p-1">UN</th>
                  <th className="border border-black p-1">QTD.</th>
                  <th className="border border-black p-1">V. UNIT.</th>
                  <th className="border border-black p-1">V. TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {(nfeData.det || []).map((it, idx) => (
                  <tr key={idx}>
                    <td className="border border-black p-1 text-center">{it.prod?.cProd}</td>
                    <td className="border border-black p-1">{it.prod?.xProd}</td>
                    <td className="border border-black p-1 text-center">{it.prod?.NCM}</td>
                    <td className="border border-black p-1 text-center">{it.prod?.CFOP}</td>
                    <td className="border border-black p-1 text-center">{it.prod?.uCom}</td>
                    <td className="border border-black p-1 text-right">
                      {Number(it.prod?.qCom ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="border border-black p-1 text-right">{formatMoney(Number(it.prod?.vUnCom ?? 0))}</td>
                    <td className="border border-black p-1 text-right">{formatMoney(Number(it.prod?.vProd ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ===== ESTE CARA AQUI VAI “COMPLETAR” O A4 ===== */}
          <div className="danfe-spacer" />

          {/* ===== DADOS ADICIONAIS (fica “ancorado” mais embaixo) ===== */}
          <div data-pdf-section className="border border-black danfe-avoid-break">
            <div className="grid grid-cols-12">
              <div className="col-span-8 border-r border-black p-1">
                <div className="text-[7px] font-bold">DADOS ADICIONAIS</div>
                <div className="text-[7px] mt-1 whitespace-pre-wrap">{nfeData.infAdic?.infCpl ?? ""}</div>
              </div>
              <div className="col-span-4 p-1">
                <div className="text-[7px] font-bold">RESERVADO AO FISCO</div>
                <div className="text-[7px] mt-1 whitespace-pre-wrap">{nfeData.infAdic?.infAdFisco ?? ""}</div>
              </div>
            </div>
          </div>

          {/* ===== RODAPÉ ===== */}
          <div className="text-[7px] mt-1 flex justify-between">
            <div className="opacity-70">{nfeData.urlDanfe ?? ""}</div>
            <div className="opacity-70">
              {formatDate(new Date().toISOString())} &nbsp; Página 1 de 1
            </div>
          </div>
        </div>
      </div>
    );
  }
);

DanfePreview.displayName = "DanfePreview";
export default DanfePreview;
