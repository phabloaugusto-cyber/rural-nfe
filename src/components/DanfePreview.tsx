import React from "react";
import { formatCpfCnpj, formatMoney, onlyDigits } from "@/lib/utils";

type DanfeItem = {
  codigo?: string;
  descricao?: string;
  ncm?: string;
  cfop?: string;
  unidade?: string;
  quantidade?: number;
  valorUnitario?: number;
  valorTotal?: number;
};

type DanfeData = {
  emitente?: any;
  destinatario?: any;
  transportadora?: any;
  nota?: any;
  itens?: DanfeItem[];
  adicionais?: {
    infCpl?: string;
  };
};

function safeStr(v: any) {
  return (v ?? "").toString();
}

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function DanfePreview({ data }: { data: DanfeData }) {
  const emit = data?.emitente || {};
  const dest = data?.destinatario || {};
  const transp = data?.transportadora || {};
  const nota = data?.nota || {};
  const itens = (data?.itens || []) as DanfeItem[];
  const infCpl = data?.adicionais?.infCpl || "";

  const totalProdutos = safeNum(nota?.vProd ?? nota?.totalProdutos ?? itens.reduce((a, i) => a + safeNum(i.valorTotal), 0));
  const totalNota = safeNum(nota?.vNF ?? nota?.totalNota ?? totalProdutos);

  const chNFe = safeStr(nota?.chNFe ?? nota?.chave ?? "");
  const nNF = safeStr(nota?.nNF ?? nota?.numero ?? "");
  const serie = safeStr(nota?.serie ?? "");
  const dhEmi = safeStr(nota?.dhEmi ?? nota?.dataEmissao ?? "");
  const dhSaiEnt = safeStr(nota?.dhSaiEnt ?? nota?.dataSaida ?? "");

  const ufEmit = safeStr(emit?.UF ?? emit?.uf ?? "");
  const munEmit = safeStr(emit?.xMun ?? emit?.municipio ?? "");
  const cepEmit = safeStr(emit?.CEP ?? emit?.cep ?? "");
  const ieEmit = safeStr(emit?.IE ?? emit?.ie ?? "");
  const cnpjEmit = formatCpfCnpj(safeStr(emit?.CNPJ ?? emit?.cnpj ?? ""));

  const ufDest = safeStr(dest?.UF ?? dest?.uf ?? "");
  const munDest = safeStr(dest?.xMun ?? dest?.municipio ?? "");
  const cepDest = safeStr(dest?.CEP ?? dest?.cep ?? "");
  const ieDest = safeStr(dest?.IE ?? dest?.ie ?? "");
  const docDest = formatCpfCnpj(safeStr(dest?.CNPJ ?? dest?.CPF ?? dest?.cnpj ?? dest?.cpf ?? ""));

  const natOp = safeStr(nota?.natOp ?? nota?.naturezaOperacao ?? "");
  const tpNF = safeStr(nota?.tpNF ?? nota?.tipoOperacao ?? "1"); // 1-saída / 0-entrada
  const mod = safeStr(nota?.mod ?? "55");

  const prot = safeStr(nota?.nProt ?? nota?.protocolo ?? "");
  const dhRecbto = safeStr(nota?.dhRecbto ?? nota?.dataAutorizacao ?? "");

  const placa = safeStr(transp?.placa ?? nota?.placa ?? "");
  const ufPlaca = safeStr(transp?.ufPlaca ?? nota?.ufPlaca ?? "");
  const freteConta = safeStr(transp?.freteConta ?? nota?.freteConta ?? "1");

  const fmtDate = (iso: string) => {
    if (!iso) return "";
    // aceita "2026-02-17" ou ISO completo
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return iso;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const chunk4 = (s: string) => onlyDigits(s).replace(/(.{4})/g, "$1 ").trim();

  return (
    <div className="danfe-a4">
      <style>{`
          /* DANFE A4: ocupa a folha inteira */
          .danfe-a4{
            width:210mm;
            height:297mm;
            padding:6mm;
            box-sizing:border-box;
            background:#fff;
            color:#000;
            font-family: Arial, Helvetica, sans-serif;
            display:flex;
            flex-direction:column;
          }

          /* Preenche o espaço “sobrando” quando há poucos itens */
          .danfe-spacer{
            flex:1 1 auto;
            min-height:6mm;
          }

          /* Em tela, deixa centralizado */
          @media screen{
            .danfe-a4{ margin: 0 auto; }
          }

          /* Em impressão/PDF: remove margens do navegador */
          @media print{
            @page { size: A4; margin: 0; }
            html, body { margin: 0; padding: 0; background: #fff; }
          }

          .b{ border:1px solid #000; }
          .bb{ border-bottom:1px solid #000; }
          .br{ border-right:1px solid #000; }
          .p2{ padding:2mm; }
          .p1{ padding:1mm; }
          .fs10{ font-size:10px; }
          .fs9{ font-size:9px; }
          .fs8{ font-size:8px; }
          .fs7{ font-size:7px; }
          .fw{ font-weight:700; }
          .center{ text-align:center; }
          .right{ text-align:right; }
          .upper{ text-transform:uppercase; }
          .row{ display:flex; width:100%; }
          .col{ display:flex; flex-direction:column; }
          .w100{ width:100%; }
          .nowrap{ white-space:nowrap; }
        `}</style>

      {/* RECEBEMOS */}
      <div className="b p1 fs8 upper">
        RECEBEMOS DE {safeStr(emit?.xNome ?? emit?.nome ?? "").toUpperCase()} OS PRODUTOS / SERVIÇOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO.
        DEST.: {safeStr(dest?.xNome ?? dest?.nome ?? "").toUpperCase()} &nbsp;—&nbsp; VALOR TOTAL: {formatMoney(totalNota)}
      </div>
      <div className="row b fs8">
        <div className="col br p1" style={{ width: "30%" }}>
          <div className="fw">DATA DO RECEBIMENTO</div>
          <div style={{ height: "7mm" }} />
        </div>
        <div className="col p1" style={{ width: "70%" }}>
          <div className="fw">IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR</div>
          <div style={{ height: "7mm" }} />
        </div>
      </div>

      {/* CABEÇALHO */}
      <div className="row b">
        <div className="col br p2" style={{ width: "34%" }}>
          <div className="fs8 fw upper">IDENTIFICAÇÃO DO EMITENTE</div>
          <div className="fs10 fw upper">{safeStr(emit?.xNome ?? emit?.nome ?? "")}</div>
          <div className="fs9 upper">{safeStr(emit?.xLgr ?? emit?.logradouro ?? "")}</div>
          <div className="fs9 upper">
            {safeStr(emit?.xMun ?? emit?.municipio ?? "")} - {ufEmit} CEP: {cepEmit}
          </div>
        </div>

        <div className="col br p2 center" style={{ width: "22%" }}>
          <div className="fs10 fw">DANFE</div>
          <div className="fs8">DOCUMENTO AUXILIAR DA NOTA FISCAL ELETRÔNICA</div>
          <div className="row" style={{ justifyContent: "center", marginTop: "2mm" }}>
            <div className="b center" style={{ width: "8mm", height: "8mm", lineHeight: "8mm" }}>
              {tpNF === "0" ? "0" : "1"}
            </div>
          </div>
          <div className="fs8" style={{ marginTop: "1mm" }}>
            0 - ENTRADA &nbsp;&nbsp; 1 - SAÍDA
          </div>
          <div className="fs9 fw" style={{ marginTop: "2mm" }}>
            Nº {nNF} &nbsp;fl. 1/1
          </div>
          <div className="fs9 fw">SÉRIE {serie}</div>
        </div>

        <div className="col p2" style={{ width: "44%" }}>
          <div className="b p1 center">
            <div className="fs8 fw">CHAVE DE ACESSO</div>
            <div className="fs10 fw nowrap">{chunk4(chNFe)}</div>
          </div>
          <div className="fs8 center" style={{ marginTop: "1mm" }}>
            Consulte a autenticidade no portal nacional da NF-e
          </div>
          <div className="b p1 center" style={{ marginTop: "1mm" }}>
            <div className="fs8 fw">PROTOCOLO DE AUTORIZAÇÃO DE USO</div>
            <div className="fs9">{prot}</div>
            <div className="fs8">{dhRecbto ? fmtDate(dhRecbto) : ""}</div>
          </div>
        </div>
      </div>

      {/* NAT OP / INSCR */}
      <div className="row b fs8">
        <div className="col br p1" style={{ width: "70%" }}>
          <div className="fw upper">NATUREZA DA OPERAÇÃO</div>
          <div className="fs9 upper">{natOp}</div>
        </div>
        <div className="col p1" style={{ width: "30%" }}>
          <div className="fw upper">INSCRIÇÃO ESTADUAL</div>
          <div className="fs9">{ieEmit}</div>
        </div>
      </div>

      {/* DESTINATÁRIO */}
      <div className="b p1 fs8 fw upper">DESTINATÁRIO / REMETENTE</div>
      <div className="row b fs8">
        <div className="col br p1" style={{ width: "60%" }}>
          <div className="fw upper">NOME / RAZÃO SOCIAL</div>
          <div className="fs9 upper">{safeStr(dest?.xNome ?? dest?.nome ?? "")}</div>
        </div>
        <div className="col br p1" style={{ width: "20%" }}>
          <div className="fw">CNPJ / CPF</div>
          <div className="fs9">{docDest}</div>
        </div>
        <div className="col p1" style={{ width: "20%" }}>
          <div className="fw">DATA DA EMISSÃO</div>
          <div className="fs9">{fmtDate(dhEmi)}</div>
        </div>
      </div>

      <div className="row b fs8">
        <div className="col br p1" style={{ width: "60%" }}>
          <div className="fw upper">ENDEREÇO</div>
          <div className="fs9 upper">{safeStr(dest?.xLgr ?? dest?.logradouro ?? "")}</div>
        </div>
        <div className="col br p1" style={{ width: "20%" }}>
          <div className="fw upper">BAIRRO / DISTRITO</div>
          <div className="fs9 upper">{safeStr(dest?.xBairro ?? dest?.bairro ?? "")}</div>
        </div>
        <div className="col p1" style={{ width: "20%" }}>
          <div className="fw upper">DATA SAÍDA/ENTRADA</div>
          <div className="fs9">{fmtDate(dhSaiEnt)}</div>
        </div>
      </div>

      <div className="row b fs8">
        <div className="col br p1" style={{ width: "40%" }}>
          <div className="fw upper">MUNICÍPIO</div>
          <div className="fs9 upper">{munDest}</div>
        </div>
        <div className="col br p1" style={{ width: "20%" }}>
          <div className="fw upper">UF</div>
          <div className="fs9">{ufDest}</div>
        </div>
        <div className="col br p1" style={{ width: "20%" }}>
          <div className="fw upper">CEP</div>
          <div className="fs9">{cepDest}</div>
        </div>
        <div className="col p1" style={{ width: "20%" }}>
          <div className="fw upper">INSCRIÇÃO ESTADUAL</div>
          <div className="fs9">{ieDest}</div>
        </div>
      </div>

      {/* CÁLCULO */}
      <div className="b p1 fs8 fw upper">CÁLCULO DO IMPOSTO</div>
      <div className="row b fs8">
        <div className="col br p1" style={{ width: "20%" }}>
          <div className="fw">BASE ICMS</div>
          <div className="fs9">{formatMoney(0)}</div>
        </div>
        <div className="col br p1" style={{ width: "20%" }}>
          <div className="fw">VALOR ICMS</div>
          <div className="fs9">{formatMoney(0)}</div>
        </div>
        <div className="col br p1" style={{ width: "20%" }}>
          <div className="fw">BASE ICMS ST</div>
          <div className="fs9">{formatMoney(0)}</div>
        </div>
        <div className="col br p1" style={{ width: "20%" }}>
          <div className="fw">VALOR ICMS ST</div>
          <div className="fs9">{formatMoney(0)}</div>
        </div>
        <div className="col p1" style={{ width: "20%" }}>
          <div className="fw">VALOR PRODUTOS</div>
          <div className="fs9">{formatMoney(totalProdutos)}</div>
        </div>
      </div>

      <div className="row b fs8">
        <div className="col br p1" style={{ width: "20%" }}>
          <div className="fw">VALOR FRETE</div>
          <div className="fs9">{formatMoney(0)}</div>
        </div>
        <div className="col br p1" style={{ width: "20%" }}>
          <div className="fw">VALOR SEGURO</div>
          <div className="fs9">{formatMoney(0)}</div>
        </div>
        <div className="col br p1" style={{ width: "20%" }}>
          <div className="fw">DESCONTO</div>
          <div className="fs9">{formatMoney(0)}</div>
        </div>
        <div className="col br p1" style={{ width: "20%" }}>
          <div className="fw">OUTRAS DESP.</div>
          <div className="fs9">{formatMoney(0)}</div>
        </div>
        <div className="col p1" style={{ width: "20%" }}>
          <div className="fw">VALOR TOTAL NOTA</div>
          <div className="fs9">{formatMoney(totalNota)}</div>
        </div>
      </div>

      {/* TRANSPORTE */}
      <div className="b p1 fs8 fw upper">TRANSPORTADOR / VOLUMES TRANSPORTADOS</div>
      <div className="row b fs8">
        <div className="col br p1" style={{ width: "35%" }}>
          <div className="fw upper">RAZÃO SOCIAL</div>
          <div className="fs9 upper">{safeStr(transp?.xNome ?? transp?.nome ?? "")}</div>
        </div>
        <div className="col br p1" style={{ width: "15%" }}>
          <div className="fw upper">FRETE POR CONTA</div>
          <div className="fs9">{freteConta}</div>
        </div>
        <div className="col br p1" style={{ width: "20%" }}>
          <div className="fw upper">PLACA DO VEÍCULO</div>
          <div className="fs9 upper">{placa}</div>
        </div>
        <div className="col br p1" style={{ width: "10%" }}>
          <div className="fw upper">UF</div>
          <div className="fs9 upper">{ufPlaca}</div>
        </div>
        <div className="col p1" style={{ width: "20%" }}>
          <div className="fw upper">CNPJ / CPF</div>
          <div className="fs9">{formatCpfCnpj(safeStr(transp?.CNPJ ?? transp?.CPF ?? transp?.cnpj ?? transp?.cpf ?? ""))}</div>
        </div>
      </div>

      {/* ITENS */}
      <div className="b p1 fs8 fw upper">DADOS DO PRODUTO / SERVIÇOS</div>
      <div className="b fs7">
        <div className="row bb fw">
          <div className="p1 br" style={{ width: "8%" }}>CÓD.</div>
          <div className="p1 br" style={{ width: "42%" }}>DESCRIÇÃO DO PRODUTO / SERVIÇO</div>
          <div className="p1 br" style={{ width: "10%" }}>NCM/SH</div>
          <div className="p1 br" style={{ width: "7%" }}>CFOP</div>
          <div className="p1 br" style={{ width: "6%" }}>UN</div>
          <div className="p1 br right" style={{ width: "7%" }}>QTD</div>
          <div className="p1 br right" style={{ width: "10%" }}>V. UNIT</div>
          <div className="p1 right" style={{ width: "10%" }}>V. TOTAL</div>
        </div>

        {itens.length === 0 ? (
          <div className="row">
            <div className="p1" style={{ width: "100%" }}>—</div>
          </div>
        ) : (
          itens.map((it, idx) => (
            <div className="row bb" key={idx}>
              <div className="p1 br upper" style={{ width: "8%" }}>{safeStr(it.codigo)}</div>
              <div className="p1 br upper" style={{ width: "42%" }}>{safeStr(it.descricao)}</div>
              <div className="p1 br" style={{ width: "10%" }}>{safeStr(it.ncm)}</div>
              <div className="p1 br" style={{ width: "7%" }}>{safeStr(it.cfop)}</div>
              <div className="p1 br" style={{ width: "6%" }}>{safeStr(it.unidade)}</div>
              <div className="p1 br right" style={{ width: "7%" }}>{safeNum(it.quantidade).toFixed(2)}</div>
              <div className="p1 br right" style={{ width: "10%" }}>{formatMoney(safeNum(it.valorUnitario))}</div>
              <div className="p1 right" style={{ width: "10%" }}>{formatMoney(safeNum(it.valorTotal))}</div>
            </div>
          ))
        )}
      </div>

      {/* Esse bloco é o que “estica” o DANFE pra preencher o A4 quando sobra espaço */}
      <div className="danfe-spacer" />

      {/* DADOS ADICIONAIS (fica no rodapé) */}
      <div className="b p1 fs8 fw upper">DADOS ADICIONAIS</div>
      <div className="row b fs8" style={{ flex: "0 0 auto" }}>
        <div className="col br p1" style={{ width: "70%" }}>
          <div className="fw upper">INFORMAÇÕES COMPLEMENTARES</div>
          <div className="fs8" style={{ whiteSpace: "pre-wrap" }}>{infCpl}</div>
        </div>
        <div className="col p1" style={{ width: "30%" }}>
          <div className="fw upper">RESERVADO AO FISCO</div>
          <div style={{ height: "16mm" }} />
        </div>
      </div>
    </div>
  );
}
