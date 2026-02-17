import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import type { NFeData } from "@/types/nfe";
import { formatCPF, formatCNPJ, formatIE, formatCEP, formatPhone } from "@/lib/utils";

interface DanfePreviewProps {
  nfe: NFeData;
  protocolo?: string | null;
  chaveAcesso?: string | null;
  qrCodeUrl?: string | null;
  // se você já usa mais props no seu projeto, mantenha aqui
}

export const DanfePreview = ({ nfe, protocolo, chaveAcesso, qrCodeUrl }: DanfePreviewProps) => {
  const emissao = nfe?.ide?.dhEmi ? new Date(nfe.ide.dhEmi) : new Date();
  const dataEmissao = format(emissao, "dd/MM/yyyy", { locale: ptBR });
  const horaEmissao = format(emissao, "HH:mm", { locale: ptBR });

  const emit = nfe?.emit || ({} as any);
  const dest = nfe?.dest || ({} as any);
  const transp = (nfe as any)?.transp || {};

  const itens = (nfe as any)?.det || [];

  // =========================
  // Helpers
  // =========================
  const safe = (v: any) => (v === null || v === undefined ? "" : String(v));
  const onlyDigits = (s: any) => safe(s).replace(/\D+/g, "");
  const n = (v: any) => {
    const x = Number(String(v).replace(",", "."));
    return Number.isFinite(x) ? x : 0;
  };
  const money = (v: any) =>
    n(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // =========================
  // Totais
  // =========================
  const totalProdutos = (nfe as any)?.total?.ICMSTot?.vProd ?? 0;
  const totalNF = (nfe as any)?.total?.ICMSTot?.vNF ?? totalProdutos;

  // =========================
  // Layout (A4 útil)
  // =========================
  // IMPORTANTE:
  // O seu DanfePage.tsx coloca a imagem no PDF com MARGIN_MM = 5.
  // Então a “área útil” da página vira:
  // A4 (210x297) - 10mm = 200x287.
  // Se o HTML tiver EXATAMENTE essa proporção, o PDF preenche certinho.
  const A4_USEFUL_W = "200mm";
  const A4_USEFUL_H = "287mm";

  return (
    <>
      <style>{`
        @page { size: A4; margin: 0; }

        @media print {
          html, body { margin: 0 !important; padding: 0 !important; }
        }

        /* Raiz do DANFE na área útil do PDF (A4 - margens do PDF) */
        .danfe-root {
          width: ${A4_USEFUL_W};
          min-height: ${A4_USEFUL_H};
          box-sizing: border-box;
          padding: 6mm;
          background: #fff;
          color: #000;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 9px;
          display: flex;
          flex-direction: column;
        }

        /* Spacer que cresce quando sobra espaço e “some” quando tem mais itens */
        .danfe-spacer {
          flex: 1 1 auto;
          min-height: 0;
        }

        /* Ajuda a evitar quebra estranha */
        @media print {
          .danfe-root { box-shadow: none !important; }
        }

        /* Pequenos ajustes visuais (opcional) */
        .danfe-box {
          border: 1px solid #000;
        }
        .danfe-row {
          display: flex;
          gap: 2mm;
        }
        .danfe-col {
          flex: 1;
        }
        .danfe-title {
          font-weight: 700;
          text-transform: uppercase;
        }
        .danfe-small {
          font-size: 8px;
        }
      `}</style>

      <div className="danfe-root">
        {/* ====== TOPO “RECEBEMOS DE” ====== */}
        <div className="danfe-box" style={{ padding: "1.5mm" }}>
          <div className="danfe-small">
            RECEBEMOS DE <b>{safe(emit?.xNome)}</b> OS PRODUTOS / SERVIÇOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO.
            DEST.: <b>{safe(dest?.xNome)}</b> - VALOR TOTAL: <b>R$ {money(totalNF)}</b>
          </div>

          <div className="danfe-row" style={{ marginTop: "1mm" }}>
            <div className="danfe-col danfe-box" style={{ padding: "1mm" }}>
              <div className="danfe-small">DATA DO RECEBIMENTO</div>
              <div style={{ height: "4mm" }} />
            </div>
            <div className="danfe-col danfe-box" style={{ padding: "1mm" }}>
              <div className="danfe-small">IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR</div>
              <div style={{ height: "4mm" }} />
            </div>
            <div className="danfe-box" style={{ padding: "1mm", width: "28mm" }}>
              <div className="danfe-title">NF-e</div>
              <div className="danfe-small">
                Nº {safe(nfe?.ide?.nNF)} <br />
                SÉRIE {safe(nfe?.ide?.serie)}
              </div>
            </div>
          </div>
        </div>

        {/* ====== IDENTIFICAÇÃO DO EMITENTE + DANFE + CHAVE ====== */}
        <div className="danfe-row" style={{ marginTop: "2mm" }}>
          <div className="danfe-col danfe-box" style={{ padding: "2mm" }}>
            <div className="danfe-small danfe-title">IDENTIFICAÇÃO DO EMITENTE</div>
            <div style={{ marginTop: "1mm" }}>
              <b>{safe(emit?.xNome)}</b>
            </div>
            <div className="danfe-small">{safe(emit?.enderEmit?.xLgr)}</div>
            <div className="danfe-small">
              {safe(emit?.enderEmit?.xMun)} - {safe(emit?.enderEmit?.UF)} CEP: {formatCEP(safe(emit?.enderEmit?.CEP))}
            </div>
          </div>

          <div className="danfe-box" style={{ width: "44mm", padding: "2mm", textAlign: "center" }}>
            <div className="danfe-title">DANFE</div>
            <div className="danfe-small" style={{ marginTop: "1mm" }}>
              DOCUMENTO AUXILIAR DA NOTA FISCAL ELETRÔNICA
            </div>
            <div className="danfe-row" style={{ justifyContent: "center", marginTop: "2mm" }}>
              <div className="danfe-box" style={{ width: "6mm", height: "6mm", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {(nfe as any)?.ide?.tpNF === "0" || (nfe as any)?.ide?.tpNF === 0 ? "0" : "1"}
              </div>
              <div className="danfe-small" style={{ marginLeft: "2mm" }}>
                - ENTRADA &nbsp; 1 - SAÍDA
              </div>
            </div>

            <div className="danfe-small" style={{ marginTop: "2mm" }}>
              Nº {safe(nfe?.ide?.nNF)} fl. 1/1 <br />
              SÉRIE {safe(nfe?.ide?.serie)}
            </div>
          </div>

          <div className="danfe-col danfe-box" style={{ padding: "2mm" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1mm" }}>
              <div className="danfe-box" style={{ padding: "1mm", textAlign: "center" }}>
                <div className="danfe-small danfe-title">CHAVE DE ACESSO</div>
                <div className="danfe-small" style={{ wordBreak: "break-all" }}>
                  {safe(chaveAcesso)}
                </div>
                <div className="danfe-small">
                  Consulte a autenticidade no portal nacional da NF-e
                </div>
              </div>

              <div className="danfe-box" style={{ padding: "1mm", textAlign: "center" }}>
                <div className="danfe-small danfe-title">PROTOCOLO DE AUTORIZAÇÃO DE USO</div>
                <div className="danfe-small">{safe(protocolo)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ====== NATUREZA / CNPJ / IE ====== */}
        <div className="danfe-box" style={{ marginTop: "2mm", padding: "1.5mm" }}>
          <div className="danfe-row">
            <div className="danfe-col">
              <div className="danfe-small danfe-title">NATUREZA DA OPERAÇÃO</div>
              <div className="danfe-small">{safe(nfe?.ide?.natOp)}</div>
            </div>
            <div style={{ width: "40mm" }}>
              <div className="danfe-small danfe-title">CNPJ/CPF</div>
              <div className="danfe-small">{formatCNPJ(onlyDigits(emit?.CNPJ || ""))}</div>
            </div>
            <div style={{ width: "40mm" }}>
              <div className="danfe-small danfe-title">INSCRIÇÃO ESTADUAL</div>
              <div className="danfe-small">{formatIE(safe(emit?.IE))}</div>
            </div>
          </div>
        </div>

        {/* ====== DESTINATÁRIO ====== */}
        <div className="danfe-box" style={{ marginTop: "2mm", padding: "1.5mm" }}>
          <div className="danfe-small danfe-title">DESTINATÁRIO / REMETENTE</div>

          <div className="danfe-row" style={{ marginTop: "1mm" }}>
            <div className="danfe-col">
              <div className="danfe-small danfe-title">NOME / RAZÃO SOCIAL</div>
              <div className="danfe-small">{safe(dest?.xNome)}</div>
            </div>

            <div style={{ width: "45mm" }}>
              <div className="danfe-small danfe-title">CNPJ / CPF</div>
              {onlyDigits(dest?.CNPJ)?.length === 14 ? (
                <div className="danfe-small">{formatCNPJ(onlyDigits(dest?.CNPJ))}</div>
              ) : (
                <div className="danfe-small">{formatCPF(onlyDigits(dest?.CPF))}</div>
              )}
            </div>

            <div style={{ width: "30mm" }}>
              <div className="danfe-small danfe-title">DATA DA EMISSÃO</div>
              <div className="danfe-small">{dataEmissao}</div>
            </div>
          </div>

          <div className="danfe-row" style={{ marginTop: "1mm" }}>
            <div className="danfe-col">
              <div className="danfe-small danfe-title">ENDEREÇO</div>
              <div className="danfe-small">{safe(dest?.enderDest?.xLgr)}</div>
            </div>
            <div style={{ width: "40mm" }}>
              <div className="danfe-small danfe-title">BAIRRO / DISTRITO</div>
              <div className="danfe-small">{safe(dest?.enderDest?.xBairro)}</div>
            </div>
            <div style={{ width: "30mm" }}>
              <div className="danfe-small danfe-title">DATA SAÍDA/ENTRADA</div>
              <div className="danfe-small">{dataEmissao}</div>
            </div>
          </div>

          <div className="danfe-row" style={{ marginTop: "1mm" }}>
            <div className="danfe-col">
              <div className="danfe-small danfe-title">MUNICÍPIO</div>
              <div className="danfe-small">{safe(dest?.enderDest?.xMun)}</div>
            </div>
            <div style={{ width: "25mm" }}>
              <div className="danfe-small danfe-title">UF</div>
              <div className="danfe-small">{safe(dest?.enderDest?.UF)}</div>
            </div>
            <div style={{ width: "40mm" }}>
              <div className="danfe-small danfe-title">CEP</div>
              <div className="danfe-small">{formatCEP(safe(dest?.enderDest?.CEP))}</div>
            </div>
            <div style={{ width: "40mm" }}>
              <div className="danfe-small danfe-title">FONE / FAX</div>
              <div className="danfe-small">{formatPhone(safe(dest?.enderDest?.fone))}</div>
            </div>
          </div>
        </div>

        {/* ====== CÁLCULO DO IMPOSTO (RESUMO) ====== */}
        <div className="danfe-box" style={{ marginTop: "2mm", padding: "1.5mm" }}>
          <div className="danfe-small danfe-title">CÁLCULO DO IMPOSTO</div>
          <div className="danfe-row" style={{ marginTop: "1mm" }}>
            <div className="danfe-col danfe-box" style={{ padding: "1mm" }}>
              <div className="danfe-small danfe-title">BASE DE CÁLCULO DO ICMS</div>
              <div className="danfe-small">{money((nfe as any)?.total?.ICMSTot?.vBC ?? 0)}</div>
            </div>
            <div className="danfe-col danfe-box" style={{ padding: "1mm" }}>
              <div className="danfe-small danfe-title">VALOR DO ICMS</div>
              <div className="danfe-small">{money((nfe as any)?.total?.ICMSTot?.vICMS ?? 0)}</div>
            </div>
            <div className="danfe-col danfe-box" style={{ padding: "1mm" }}>
              <div className="danfe-small danfe-title">VALOR TOTAL DOS PRODUTOS</div>
              <div className="danfe-small">{money(totalProdutos)}</div>
            </div>
            <div className="danfe-col danfe-box" style={{ padding: "1mm" }}>
              <div className="danfe-small danfe-title">VALOR TOTAL DA NOTA</div>
              <div className="danfe-small">{money(totalNF)}</div>
            </div>
          </div>
        </div>

        {/* ====== TRANSPORTADOR ====== */}
        <div className="danfe-box" style={{ marginTop: "2mm", padding: "1.5mm" }}>
          <div className="danfe-small danfe-title">TRANSPORTADOR / VOLUMES TRANSPORTADOS</div>
          <div className="danfe-row" style={{ marginTop: "1mm" }}>
            <div className="danfe-col">
              <div className="danfe-small danfe-title">RAZÃO SOCIAL</div>
              <div className="danfe-small">{safe(transp?.transporta?.xNome)}</div>
            </div>
            <div style={{ width: "45mm" }}>
              <div className="danfe-small danfe-title">FRETE POR CONTA</div>
              <div className="danfe-small">{safe(transp?.modFrete)}</div>
            </div>
            <div style={{ width: "45mm" }}>
              <div className="danfe-small danfe-title">PLACA DO VEÍCULO</div>
              <div className="danfe-small">{safe(transp?.veicTransp?.placa)}</div>
            </div>
            <div style={{ width: "20mm" }}>
              <div className="danfe-small danfe-title">UF</div>
              <div className="danfe-small">{safe(transp?.veicTransp?.UF)}</div>
            </div>
          </div>
        </div>

        {/* ====== ITENS ====== */}
        <div className="danfe-box" style={{ marginTop: "2mm", padding: "1.5mm" }}>
          <div className="danfe-small danfe-title">DADOS DO PRODUTO / SERVIÇOS</div>

          <div className="danfe-box" style={{ marginTop: "1mm" }}>
            <div className="danfe-row danfe-small" style={{ padding: "1mm", fontWeight: 700 }}>
              <div style={{ width: "10mm" }}>CÓD.</div>
              <div style={{ flex: 1 }}>DESCRIÇÃO DO PRODUTO / SERVIÇO</div>
              <div style={{ width: "18mm" }}>NCM/SH</div>
              <div style={{ width: "12mm" }}>CFOP</div>
              <div style={{ width: "10mm" }}>UN</div>
              <div style={{ width: "18mm", textAlign: "right" }}>QUANT.</div>
              <div style={{ width: "18mm", textAlign: "right" }}>V. UNIT.</div>
              <div style={{ width: "22mm", textAlign: "right" }}>V. TOTAL</div>
            </div>

            {itens.map((it: any, idx: number) => {
              const p = it?.prod || {};
              return (
                <div key={idx} className="danfe-row danfe-small" style={{ padding: "1mm", borderTop: "1px solid #000" }}>
                  <div style={{ width: "10mm" }}>{safe(p?.cProd)}</div>
                  <div style={{ flex: 1 }}>{safe(p?.xProd)}</div>
                  <div style={{ width: "18mm" }}>{safe(p?.NCM)}</div>
                  <div style={{ width: "12mm" }}>{safe(p?.CFOP)}</div>
                  <div style={{ width: "10mm" }}>{safe(p?.uCom)}</div>
                  <div style={{ width: "18mm", textAlign: "right" }}>{money(p?.qCom)}</div>
                  <div style={{ width: "18mm", textAlign: "right" }}>{money(p?.vUnCom)}</div>
                  <div style={{ width: "22mm", textAlign: "right" }}>{money(p?.vProd)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ✅ ESTE É O “PREENCHEDOR” QUE SOME OU CRESCE AUTOMATICAMENTE */}
        <div className="danfe-spacer" />

        {/* ====== DADOS ADICIONAIS ====== */}
        <div className="danfe-box" style={{ marginTop: "2mm", padding: "1.5mm" }}>
          <div className="danfe-small danfe-title">DADOS ADICIONAIS</div>

          <div className="danfe-row" style={{ marginTop: "1mm" }}>
            <div className="danfe-col danfe-box" style={{ padding: "1mm", minHeight: "22mm" }}>
              <div className="danfe-small danfe-title">INFORMAÇÕES COMPLEMENTARES</div>
              <div className="danfe-small" style={{ whiteSpace: "pre-wrap" }}>
                {safe((nfe as any)?.infAdic?.infCpl)}
              </div>
            </div>

            <div className="danfe-col danfe-box" style={{ padding: "1mm", minHeight: "22mm" }}>
              <div className="danfe-small danfe-title">RESERVADO AO FISCO</div>
              <div className="danfe-small" style={{ whiteSpace: "pre-wrap" }}>
                {safe((nfe as any)?.infAdic?.infAdFisco)}
              </div>
            </div>
          </div>
        </div>

        {/* ====== RODAPÉ ====== */}
        <div className="danfe-small" style={{ marginTop: "2mm", display: "flex", justifyContent: "space-between" }}>
          <div style={{ opacity: 0.6 }}>
            {qrCodeUrl ? qrCodeUrl : ""}
          </div>
          <div style={{ opacity: 0.6 }}>
            {dataEmissao}, {horaEmissao} — Página 1 de 1
          </div>
        </div>
      </div>
    </>
  );
};

export default DanfePreview;
