import { format, parseISO } from "date-fns";
import JsBarcode from "jsbarcode";
import { useEffect, useMemo, useRef, useState } from "react";

interface DanfeEmitente {
  nome: string;
  cnpj: string;
  ie: string;
  endereco: string;
  municipio: string;
  uf: string;
  cep: string;
  fone?: string;
}

interface DanfeDestinatario {
  nome: string;
  cnpjCpf: string;
  ie?: string;
  endereco: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  fone?: string;
}

interface DanfeProduto {
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  un: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  bcIcms?: number;
  valorIcms?: number;
  valorIpi?: number;
  aliqIcms?: number;
  aliqIpi?: number;
}

interface DanfeTotais {
  baseCalculoIcms: number;
  valorIcms: number;
  baseCalculoIcmsSt: number;
  valorIcmsSt: number;
  valorProdutos: number;
  valorFrete: number;
  valorSeguro: number;
  desconto: number;
  outrasDespesas: number;
  valorIpi: number;
  valorTotalNfe: number;
}

interface DanfeTransporte {
  razaoSocial?: string;
  fretePorConta?: string;
  codigoAntt?: string;
  placa?: string;
  ufPlaca?: string;
  cnpjCpf?: string;
  endereco?: string;
  municipio?: string;
  uf?: string;
  quantidade?: string;
  especie?: string;
  marca?: string;
  numeracao?: string;
  pesoBruto?: string;
  pesoLiquido?: string;
}

interface DanfeData {
  chaveAcesso: string;
  numero: string;
  serie: string;
  naturezaOperacao: string;
  protocoloAutorizacao?: string;
  dataAutorizacao?: string;
  dataEmissao: string;
  dataSaidaEntrada?: string;
  tipo: "0" | "1"; // 0 entrada, 1 saída
  emitente: DanfeEmitente;
  destinatario: DanfeDestinatario;
  totais: DanfeTotais;
  produtos: DanfeProduto[];
  transporte?: DanfeTransporte;
  infoComplementar?: string;
  urlConsulta?: string;
}

interface DanfePreviewProps {
  danfe?: DanfeData;
  showUrl?: boolean;
  url?: string;
  hidden?: boolean;
}

function safeUpper(s?: string) {
  return (s || "").toUpperCase();
}

function fmtMoney(v?: number) {
  const n = Number(v || 0);
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtNum(v?: number) {
  const n = Number(v || 0);
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 4 });
}

function onlyDigits(s?: string) {
  return (s || "").replace(/\D+/g, "");
}

function formatCnpjCpf(doc: string) {
  const d = onlyDigits(doc);
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  return doc;
}

function formatCep(cep?: string) {
  const d = onlyDigits(cep);
  if (d.length === 8) return d.replace(/^(\d{5})(\d{3})$/, "$1-$2");
  return cep || "";
}

function splitToLines(text: string, maxLen = 95) {
  const t = (text || "").trim();
  if (!t) return [];
  const words = t.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxLen) {
      if (cur.trim()) lines.push(cur.trim());
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}

const DanfePreview = (props: DanfePreviewProps) => {
  const { danfe, showUrl = true, url, hidden } = props;

  const barcodeRef = useRef<SVGSVGElement | null>(null);

  const protocoloLines = useMemo(() => {
    const prot = danfe?.protocoloAutorizacao || "";
    const dh = danfe?.dataAutorizacao || "";
    const s = [prot, dh].filter(Boolean).join(" - ");
    return splitToLines(s, 46);
  }, [danfe?.protocoloAutorizacao, danfe?.dataAutorizacao]);

  useEffect(() => {
    if (!danfe?.chaveAcesso || !barcodeRef.current) return;
    try {
      JsBarcode(barcodeRef.current, danfe.chaveAcesso, {
        format: "CODE128",
        displayValue: false,
        height: 48,
        margin: 0,
      });
    } catch {
      // ignore
    }
  }, [danfe?.chaveAcesso]);

  if (!danfe || hidden) return null;

  const tipoTexto = danfe.tipo === "0" ? "ENTRADA" : "SAÍDA";

  const infoComplementarLines = splitToLines(danfe.infoComplementar || "", 120);

  return (
    <>
      <style>{`
@page { size: A4; margin: 0; }
@media print {
  html, body { width: 210mm; height: 297mm; margin: 0 !important; padding: 0 !important; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .danfe-page { margin: 0 !important; box-shadow: none !important; }
}
.danfe-page { width: 210mm; height: 297mm; background: #fff; color: #000; }
.danfe-inner { height: 100%; padding: 6mm; box-sizing: border-box; display: flex; flex-direction: column; }
.danfe-spacer { flex: 1 1 auto; min-height: 0; }
`}</style>

      <div className="danfe-page mx-auto shadow-xl print:shadow-none">
        <div className="danfe-inner">
          {/* Cabeçalho - Recebemos */}
          <div className="border border-black text-[8px] leading-tight">
            <div className="flex">
              <div className="flex-1 border-r border-black p-1">
                RECEBEMOS DE{" "}
                <span className="font-bold">{safeUpper(danfe.emitente.nome)}</span> OS PRODUTOS / SERVIÇOS
                CONSTANTES DA NOTA FISCAL INDICADA AO LADO. DEST.:{" "}
                <span className="font-bold">{safeUpper(danfe.destinatario.nome)}</span> - VALOR TOTAL:{" "}
                <span className="font-bold">R$ {fmtMoney(danfe.totais.valorTotalNfe)}</span>
              </div>
              <div className="w-[64mm] p-1 text-right">
                <div className="font-bold text-[10px]">NF-e</div>
                <div className="font-bold text-[10px]">
                  Nº {danfe.numero}
                </div>
                <div className="font-bold text-[10px]">SÉRIE {danfe.serie}</div>
              </div>
            </div>
            <div className="flex border-t border-black">
              <div className="flex-1 border-r border-black p-1">
                DATA DE RECEBIMENTO
              </div>
              <div className="w-[64mm] p-1">IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR</div>
            </div>
          </div>

          {/* Bloco Emitente / DANFE / Chave */}
          <div className="border border-black border-t-0 text-[8px] leading-tight">
            <div className="flex">
              <div className="w-[75mm] border-r border-black p-2">
                <div className="font-bold text-[12px]">{safeUpper(danfe.emitente.nome)}</div>
                <div>{danfe.emitente.endereco}</div>
                <div>
                  {danfe.emitente.municipio} - {danfe.emitente.uf} CEP: {formatCep(danfe.emitente.cep)}
                </div>
              </div>

              <div className="w-[40mm] border-r border-black p-2 text-center">
                <div className="font-bold text-[14px]">DANFE</div>
                <div className="text-[7px]">
                  DOCUMENTO AUXILIAR DA
                  <br />
                  NOTA FISCAL ELETRÔNICA
                </div>
                <div className="mt-1 flex items-center justify-center gap-2 text-[9px]">
                  <span>0 - ENTRADA</span>
                  <span>1 - SAÍDA</span>
                </div>
                <div className="mt-1 text-[14px] font-bold border border-black inline-block px-2 py-0.5">
                  {danfe.tipo}
                </div>
                <div className="mt-1 font-bold text-[10px]">
                  Nº {danfe.numero} fl. 1/1
                </div>
                <div className="font-bold text-[10px]">SÉRIE {danfe.serie}</div>
              </div>

              <div className="flex-1 p-2">
                <div className="border border-black p-1 text-center">
                  <div className="font-bold">CHAVE DE ACESSO</div>
                  <div className="font-bold text-[10px] tracking-[1px]">
                    {danfe.chaveAcesso.replace(/(\d{4})(?=\d)/g, "$1 ")}
                  </div>
                  <div className="mt-1 flex items-center justify-center">
                    <svg ref={barcodeRef} />
                  </div>
                  <div className="text-[7px] mt-1">
                    Consulta de autenticidade no portal nacional da NF-e
                  </div>
                  {danfe.urlConsulta ? (
                    <div className="text-[7px]">{danfe.urlConsulta}</div>
                  ) : null}
                </div>

                <div className="border border-black border-t-0 p-1 mt-1 text-center">
                  <div className="font-bold">PROTOCOLO DE AUTORIZAÇÃO DE USO</div>
                  {protocoloLines.length ? (
                    protocoloLines.map((l, idx) => (
                      <div key={idx} className="font-bold text-[9px]">
                        {l}
                      </div>
                    ))
                  ) : (
                    <div className="text-[9px]">—</div>
                  )}
                </div>

                <div className="border border-black border-t-0 p-1 mt-1">
                  <div className="flex">
                    <div className="flex-1">
                      <div className="text-[7px]">INSCRIÇÃO ESTADUAL</div>
                      <div className="font-bold text-[9px]">{danfe.emitente.ie || "—"}</div>
                    </div>
                    <div className="w-[50%]">
                      <div className="text-[7px]">CNPJ</div>
                      <div className="font-bold text-[9px]">{formatCnpjCpf(danfe.emitente.cnpj)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Natureza / IE ST / CNPJ/CPF */}
            <div className="border-t border-black flex">
              <div className="flex-1 border-r border-black p-1">
                <div className="text-[7px]">NATUREZA DA OPERAÇÃO</div>
                <div className="font-bold text-[9px]">{danfe.naturezaOperacao}</div>
              </div>
              <div className="w-[55mm] border-r border-black p-1">
                <div className="text-[7px]">INSCRIÇÃO ESTADUAL DO SUBST. TRIB.</div>
                <div className="font-bold text-[9px]">—</div>
              </div>
              <div className="w-[50mm] p-1">
                <div className="text-[7px]">CNPJ / CPF</div>
                <div className="font-bold text-[9px]">{formatCnpjCpf(danfe.emitente.cnpj)}</div>
              </div>
            </div>

            {/* Destinatário */}
            <div className="border-t border-black p-1">
              <div className="font-bold text-[9px]">DESTINATÁRIO / REMETENTE</div>
            </div>

            <div className="border-t border-black flex">
              <div className="flex-1 border-r border-black p-1">
                <div className="text-[7px]">NOME / RAZÃO SOCIAL</div>
                <div className="font-bold text-[9px]">{safeUpper(danfe.destinatario.nome)}</div>
              </div>
              <div className="w-[50mm] border-r border-black p-1">
                <div className="text-[7px]">CNPJ / CPF</div>
                <div className="font-bold text-[9px]">{formatCnpjCpf(danfe.destinatario.cnpjCpf)}</div>
              </div>
              <div className="w-[35mm] p-1">
                <div className="text-[7px]">DATA DA EMISSÃO</div>
                <div className="font-bold text-[9px]">
                  {danfe.dataEmissao ? format(parseISO(danfe.dataEmissao), "dd/MM/yyyy") : "—"}
                </div>
              </div>
            </div>

            <div className="border-t border-black flex">
              <div className="flex-1 border-r border-black p-1">
                <div className="text-[7px]">ENDEREÇO</div>
                <div className="font-bold text-[9px]">{safeUpper(danfe.destinatario.endereco)}</div>
              </div>
              <div className="w-[45mm] border-r border-black p-1">
                <div className="text-[7px]">BAIRRO / DISTRITO</div>
                <div className="font-bold text-[9px]">{safeUpper(danfe.destinatario.bairro)}</div>
              </div>
              <div className="w-[40mm] p-1">
                <div className="text-[7px]">DATA DA SAÍDA / ENTRADA</div>
                <div className="font-bold text-[9px]">
                  {danfe.dataSaidaEntrada
                    ? format(parseISO(danfe.dataSaidaEntrada), "dd/MM/yyyy")
                    : "—"}
                </div>
              </div>
            </div>

            <div className="border-t border-black flex">
              <div className="flex-1 border-r border-black p-1">
                <div className="text-[7px]">MUNICÍPIO</div>
                <div className="font-bold text-[9px]">{safeUpper(danfe.destinatario.municipio)}</div>
              </div>
              <div className="w-[25mm] border-r border-black p-1">
                <div className="text-[7px]">UF</div>
                <div className="font-bold text-[9px]">{safeUpper(danfe.destinatario.uf)}</div>
              </div>
              <div className="w-[35mm] border-r border-black p-1">
                <div className="text-[7px]">CEP</div>
                <div className="font-bold text-[9px]">{formatCep(danfe.destinatario.cep)}</div>
              </div>
              <div className="w-[45mm] p-1">
                <div className="text-[7px]">FONE / FAX</div>
                <div className="font-bold text-[9px]">{danfe.destinatario.fone || "—"}</div>
              </div>
            </div>

            {/* Cálculo do imposto */}
            <div className="border-t border-black p-1">
              <div className="font-bold text-[9px]">CÁLCULO DO IMPOSTO</div>
            </div>

            <div className="border-t border-black grid grid-cols-6 text-[8px]">
              {[
                ["BASE DE CÁLCULO DO ICMS", fmtMoney(danfe.totais.baseCalculoIcms)],
                ["VALOR DO ICMS", fmtMoney(danfe.totais.valorIcms)],
                ["BASE CALC. ICMS SUBST.", fmtMoney(danfe.totais.baseCalculoIcmsSt)],
                ["VALOR DO ICMS SUBST.", fmtMoney(danfe.totais.valorIcmsSt)],
                ["VALOR TOTAL DOS PRODUTOS", fmtMoney(danfe.totais.valorProdutos)],
                ["VALOR TOTAL DA NOTA", fmtMoney(danfe.totais.valorTotalNfe)],
              ].map(([label, value], i) => (
                <div key={i} className={`p-1 border-black ${i < 5 ? "border-r" : ""}`}>
                  <div className="text-[7px]">{label}</div>
                  <div className="font-bold text-[9px] text-right">{value}</div>
                </div>
              ))}
            </div>

            {/* Transporte */}
            <div className="border-t border-black p-1">
              <div className="font-bold text-[9px]">TRANSPORTADOR / VOLUMES TRANSPORTADOS</div>
            </div>

            <div className="border-t border-black grid grid-cols-6 text-[8px]">
              <div className="col-span-2 p-1 border-r border-black">
                <div className="text-[7px]">RAZÃO SOCIAL</div>
                <div className="font-bold text-[9px]">{safeUpper(danfe.transporte?.razaoSocial || "—")}</div>
              </div>
              <div className="p-1 border-r border-black">
                <div className="text-[7px]">FRETE POR CONTA</div>
                <div className="font-bold text-[9px]">{danfe.transporte?.fretePorConta || "—"}</div>
              </div>
              <div className="p-1 border-r border-black">
                <div className="text-[7px]">CÓDIGO ANTT</div>
                <div className="font-bold text-[9px]">{danfe.transporte?.codigoAntt || "—"}</div>
              </div>
              <div className="p-1 border-r border-black">
                <div className="text-[7px]">PLACA DO VEÍCULO</div>
                <div className="font-bold text-[9px]">{danfe.transporte?.placa || "—"}</div>
              </div>
              <div className="p-1">
                <div className="text-[7px]">UF</div>
                <div className="font-bold text-[9px]">{danfe.transporte?.ufPlaca || "—"}</div>
              </div>
            </div>

            <div className="border-t border-black grid grid-cols-6 text-[8px]">
              <div className="col-span-2 p-1 border-r border-black">
                <div className="text-[7px]">ENDEREÇO</div>
                <div className="font-bold text-[9px]">{safeUpper(danfe.transporte?.endereco || "—")}</div>
              </div>
              <div className="p-1 border-r border-black">
                <div className="text-[7px]">MUNICÍPIO</div>
                <div className="font-bold text-[9px]">{safeUpper(danfe.transporte?.municipio || "—")}</div>
              </div>
              <div className="p-1 border-r border-black">
                <div className="text-[7px]">UF</div>
                <div className="font-bold text-[9px]">{safeUpper(danfe.transporte?.uf || "—")}</div>
              </div>
              <div className="p-1 border-r border-black">
                <div className="text-[7px]">CNPJ / CPF</div>
                <div className="font-bold text-[9px]">{formatCnpjCpf(danfe.transporte?.cnpjCpf || "—")}</div>
              </div>
              <div className="p-1 border-r border-black">
                <div className="text-[7px]">INSCRIÇÃO ESTADUAL</div>
                <div className="font-bold text-[9px]">—</div>
              </div>
              <div className="p-1">
                <div className="text-[7px]">PESO BRUTO (KG)</div>
                <div className="font-bold text-[9px]">{danfe.transporte?.pesoBruto || "—"}</div>
              </div>
            </div>

            {/* Produtos */}
            <div className="border-t border-black p-1">
              <div className="font-bold text-[9px]">DADOS DO PRODUTO / SERVIÇOS</div>
            </div>

            <div className="border-t border-black text-[7px]">
              <div className="grid grid-cols-12 border-b border-black font-bold">
                <div className="col-span-1 p-1 border-r border-black">CÓD</div>
                <div className="col-span-4 p-1 border-r border-black">DESCRIÇÃO DO PRODUTO / SERVIÇO</div>
                <div className="col-span-1 p-1 border-r border-black">NCM/SH</div>
                <div className="col-span-1 p-1 border-r border-black">CFOP</div>
                <div className="col-span-1 p-1 border-r border-black">UN</div>
                <div className="col-span-1 p-1 border-r border-black text-right">QUANT.</div>
                <div className="col-span-1 p-1 border-r border-black text-right">V. UNIT.</div>
                <div className="col-span-1 p-1 border-r border-black text-right">V. TOTAL</div>
                <div className="col-span-1 p-1 text-right">B.C. ICMS</div>
              </div>

              {danfe.produtos.map((p, idx) => (
                <div key={idx} className="grid grid-cols-12 border-b border-black last:border-b-0">
                  <div className="col-span-1 p-1 border-r border-black">{p.codigo}</div>
                  <div className="col-span-4 p-1 border-r border-black">{p.descricao}</div>
                  <div className="col-span-1 p-1 border-r border-black">{p.ncm}</div>
                  <div className="col-span-1 p-1 border-r border-black">{p.cfop}</div>
                  <div className="col-span-1 p-1 border-r border-black">{p.un}</div>
                  <div className="col-span-1 p-1 border-r border-black text-right">{fmtNum(p.quantidade)}</div>
                  <div className="col-span-1 p-1 border-r border-black text-right">{fmtMoney(p.valorUnitario)}</div>
                  <div className="col-span-1 p-1 border-r border-black text-right">{fmtMoney(p.valorTotal)}</div>
                  <div className="col-span-1 p-1 text-right">{fmtMoney(p.bcIcms || 0)}</div>
                </div>
              ))}
            </div>

            {/* Spacer que cresce para preencher a página quando sobra espaço */}
            <div className="danfe-spacer" />

            {/* Dados adicionais */}
            <div className="border-t border-black p-1">
              <div className="font-bold text-[9px]">DADOS ADICIONAIS</div>
            </div>

            <div className="border-t border-black grid grid-cols-2 text-[8px]">
              <div className="p-1 border-r border-black">
                <div className="text-[7px] font-bold">INFORMAÇÕES COMPLEMENTARES</div>
                {infoComplementarLines.length ? (
                  infoComplementarLines.map((l, idx) => (
                    <div key={idx} className="text-[8px] leading-tight">
                      {l}
                    </div>
                  ))
                ) : (
                  <div className="text-[8px]">—</div>
                )}
              </div>
              <div className="p-1">
                <div className="text-[7px] font-bold">RESERVADO AO FISCO</div>
                <div className="text-[8px]">—</div>
              </div>
            </div>
          </div>

          {/* Rodapé URL */}
          {showUrl && (url || danfe.urlConsulta) ? (
            <div className="mt-2 text-[8px] text-gray-700 flex justify-between">
              <div className="truncate">
                {url || danfe.urlConsulta}
              </div>
              <div className="whitespace-nowrap">
                {format(new Date(), "dd/MM/yyyy, HH:mm")}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
};

export default DanfePreview;
