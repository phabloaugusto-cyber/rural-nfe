// generateNFeXml.ts
// Gera XML NF-e (modelo 55 / versão 4.00) para o seu sistema Rural NFe.
// PRINCIPAIS CORREÇÕES:
// - Id do infNFe sempre no padrão: "NFe" + 44 dígitos
// - UF nunca fica vazia (trata "" como ausente)
// - cUF derivado da UF do emitente
// - Validação de série (máx 3 dígitos) e número (9 dígitos)
// - Extrai código IBGE (7 dígitos) do município quando vier junto no texto
// - Inclui campos obrigatórios de <ide> (cNF, tpEmis, cDV, etc.)

export interface ProdutoItem {
  descricao: string;
  ncm: string;
  cest?: string;
  codigo_sefaz?: string; // usado como CFOP quando não houver campo específico
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  desconto?: number;
}

export interface NotaData {
  // Dados básicos
  natureza_operacao: string;
  serie: number | string;
  numero: number | string;
  data_emissao?: string; // ISO ou dd/mm/aaaa; se vazio usa agora

  // Emitente
  emitente_cnpj: string;
  emitente_razao: string;
  emitente_fantasia?: string;
  emitente_ie: string;
  emitente_endereco: string;
  emitente_numero: string;
  emitente_bairro: string;
  emitente_cidade: string; // pode vir "Caiapônia" ou "Caiapônia (5204300)" ou "5204300"
  emitente_uf: string;     // "GO"
  emitente_cep: string;

  // Destinatário
  destinatario_documento: string; // CPF/CNPJ
  destinatario_nome: string;
  destinatario_ie?: string;       // pode ser vazio
  destinatario_endereco: string;
  destinatario_numero: string;
  destinatario_bairro: string;
  destinatario_cidade: string; // pode vir com código IBGE igual ao emitente
  destinatario_uf: string;
  destinatario_cep: string;

  // Itens
  produtos: ProdutoItem[];

  // Totais/obs
  observacao?: string;

  // (Opcional) se você já calcula a chave, pode passar aqui — mas precisa ter 44 dígitos
  chave_acesso?: string;

  // Ambiente (1=produção, 2=homologação)
  tpAmb?: 1 | 2;
}

type UF =
  | "AC" | "AL" | "AM" | "AP" | "BA" | "CE" | "DF" | "ES" | "GO" | "MA" | "MG" | "MS" | "MT"
  | "PA" | "PB" | "PE" | "PI" | "PR" | "RJ" | "RN" | "RO" | "RR" | "RS" | "SC" | "SE" | "SP" | "TO";

const UF_TO_CUF: Record<UF, string> = {
  AC: "12", AL: "27", AM: "13", AP: "16", BA: "29", CE: "23", DF: "53", ES: "32", GO: "52",
  MA: "21", MG: "31", MS: "50", MT: "51", PA: "15", PB: "25", PE: "26", PI: "22", PR: "41",
  RJ: "33", RN: "24", RO: "11", RR: "14", RS: "43", SC: "42", SE: "28", SP: "35", TO: "17",
};

function onlyDigits(v: string): string {
  return (v || "").replace(/\D/g, "");
}

function padLeft(v: string, len: number, ch = "0") {
  return v.padStart(len, ch);
}

function sanitizeUF(v: string, fallback: UF): UF {
  const uf = (v?.trim() || fallback).toUpperCase() as UF;
  if (!(uf in UF_TO_CUF)) return fallback;
  return uf;
}

function parseMunicipioCodigo(v: string): string {
  // tenta achar 7 dígitos em qualquer lugar do texto
  const digits = onlyDigits(v);
  const m = digits.match(/\d{7}/);
  return m ? m[0] : "";
}

function municipioNome(v: string): string {
  const cleaned = (v || "")
    .replace(/\d+/g, " ")
    .replace(/[()\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || (v || "").trim();
}

function toIsoDhEmi(input?: string): string {
  // aceita:
  // - ISO já (2026-02-17T03:27:00-03:00)
  // - dd/mm/aaaa (com ou sem hora; se sem hora usa 00:00:00)
  if (!input || !input.trim()) {
    return new Date().toISOString();
  }
  const s = input.trim();

  // ISO
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s;

  // dd/mm/aaaa
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yyyy = Number(m[3]);
    const HH = Number(m[4] || "00");
    const MI = Number(m[5] || "00");
    const SS = Number(m[6] || "00");
    const dt = new Date(Date.UTC(yyyy, mm - 1, dd, HH, MI, SS));
    return dt.toISOString();
  }

  // fallback: tenta Date.parse
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return new Date(t).toISOString();

  // último recurso: agora
  return new Date().toISOString();
}

function mod11Dv(chave43: string): string {
  // DV da chave de acesso NF-e (módulo 11)
  const weights = [2, 3, 4, 5, 6, 7, 8, 9];
  let total = 0;
  let w = 0;
  for (let i = chave43.length - 1; i >= 0; i--) {
    total += Number(chave43[i]) * weights[w];
    w = (w + 1) % weights.length;
  }
  const mod = total % 11;
  let dv = 11 - mod;
  if (dv === 10 || dv === 11) dv = 0;
  return String(dv);
}

function buildChaveAcesso(params: {
  uf: UF;
  dhEmiIso: string;
  cnpj: string;
  mod: "55";
  serie: string; // 3
  nNF: string;   // 9
  tpEmis: "1";
  cNF: string;   // 8
}): { chave: string; cDV: string } {
  // AAMM = ano(2) mes(2) a partir da data de emissão
  const dt = new Date(params.dhEmiIso);
  const aa = String(dt.getUTCFullYear()).slice(-2);
  const mm = padLeft(String(dt.getUTCMonth() + 1), 2);
  const AAMM = aa + mm;

  const cUF = UF_TO_CUF[params.uf];
  const cnpj14 = padLeft(onlyDigits(params.cnpj), 14);

  const chave43 =
    cUF +
    AAMM +
    cnpj14 +
    params.mod +
    params.serie +
    params.nNF +
    params.tpEmis +
    params.cNF;

  const cDV = mod11Dv(chave43);
  return { chave: chave43 + cDV, cDV };
}

function escapeXml(value: string): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function assertSerieNumero(serieRaw: string, nNFRaw: string) {
  const serieNum = Number(serieRaw);
  if (!Number.isFinite(serieNum) || serieNum < 0 || serieNum > 999) {
    throw new Error(`Série inválida: "${serieRaw}". NF-e aceita série de 0 a 999 (até 3 dígitos).`);
  }
  const nNum = Number(nNFRaw);
  if (!Number.isFinite(nNum) || nNum < 1 || nNum > 999999999) {
    throw new Error(`Número da NF-e inválido: "${nNFRaw}". Deve ser de 1 a 999999999 (até 9 dígitos).`);
  }
}

/**
 * Gera o XML da NF-e (NFe 4.00).
 * Observação: Assinatura digital e transmissão via SEFAZ ficam em outro módulo.
 */
export function generateNFeXml(nota: NotaData): string {
  // UF: trata "" como ausente
  const ufEmit = sanitizeUF(nota.emitente_uf, "GO");
  const ufDest = sanitizeUF(nota.destinatario_uf, ufEmit);

  const tpAmb: 1 | 2 = nota.tpAmb === 2 ? 2 : 1;

  const dhEmi = toIsoDhEmi(nota.data_emissao);

  const serie = String(nota.serie ?? "").trim();
  const nNF = String(nota.numero ?? "").trim();

  assertSerieNumero(serie, nNF);

  const serie3 = padLeft(onlyDigits(serie), 3);
  const nNF9 = padLeft(onlyDigits(nNF), 9);

  const cNF = padLeft(String(Math.floor(Math.random() * 1e8)), 8);

  const tpEmis: "1" = "1";
  const mod: "55" = "55";

  // Município IBGE (7 dígitos) — tenta extrair do texto
  const cMunFG = parseMunicipioCodigo(nota.emitente_cidade);
  if (!cMunFG) {
    throw new Error(
      `Emitente: informe o código IBGE do município (7 dígitos). Ex.: "Caiapônia (5204300)". Recebido: "${nota.emitente_cidade}".`
    );
  }
  const cMunDest = parseMunicipioCodigo(nota.destinatario_cidade) || cMunFG;

  // Chave de acesso: se vier, precisa ter 44 dígitos, senão recalcula
  const chaveDigits = onlyDigits(nota.chave_acesso || "");
  const { chave, cDV } =
    chaveDigits.length === 44
      ? { chave: chaveDigits, cDV: chaveDigits.slice(-1) }
      : buildChaveAcesso({
          uf: ufEmit,
          dhEmiIso: dhEmi,
          cnpj: nota.emitente_cnpj,
          mod,
          serie: serie3,
          nNF: nNF9,
          tpEmis,
          cNF,
        });

  const id = `NFe${chave}`;

  const indIEDest = (() => {
    // 1=Contribuinte ICMS, 2=Contribuinte isento, 9=Não contribuinte
    const doc = onlyDigits(nota.destinatario_documento || "");
    const ie = (nota.destinatario_ie || "").trim();
    if (doc.length === 14) {
      // CNPJ
      if (ie) return "1";
      return "2";
    }
    // CPF
    return "9";
  })();

  const emitCNPJ = padLeft(onlyDigits(nota.emitente_cnpj), 14);
  const destDoc = onlyDigits(nota.destinatario_documento || "");
  const destIsCnpj = destDoc.length === 14;

  const totalProdutos = nota.produtos.reduce((acc, p) => acc + (p.quantidade || 0) * (p.valor_unitario || 0), 0);
  const totalDesconto = nota.produtos.reduce((acc, p) => acc + (p.desconto || 0), 0);
  const vNF = Math.max(0, totalProdutos - totalDesconto);

  const detXml = nota.produtos
    .map((p, idx) => {
      const nItem = idx + 1;
      const vProd = (p.quantidade || 0) * (p.valor_unitario || 0);
      const vDesc = p.desconto || 0;

      const cfop = onlyDigits(p.codigo_sefaz || "") || "5923"; // ajuste se necessário

      return `
      <det nItem="${nItem}">
        <prod>
          <cProd>${nItem}</cProd>
          <cEAN></cEAN>
          <xProd>${escapeXml(p.descricao)}</xProd>
          <NCM>${escapeXml(p.ncm || "01022990")}</NCM>
          ${p.cest ? `<CEST>${escapeXml(p.cest)}</CEST>` : ``}
          <CFOP>${escapeXml(cfop)}</CFOP>
          <uCom>${escapeXml(p.unidade || "UN")}</uCom>
          <qCom>${Number(p.quantidade || 0).toFixed(4)}</qCom>
          <vUnCom>${Number(p.valor_unitario || 0).toFixed(10)}</vUnCom>
          <vProd>${Number(vProd).toFixed(2)}</vProd>
          <cEANTrib></cEANTrib>
          <uTrib>${escapeXml(p.unidade || "UN")}</uTrib>
          <qTrib>${Number(p.quantidade || 0).toFixed(4)}</qTrib>
          <vUnTrib>${Number(p.valor_unitario || 0).toFixed(10)}</vUnTrib>
          ${vDesc > 0 ? `<vDesc>${Number(vDesc).toFixed(2)}</vDesc>` : ``}
          <indTot>1</indTot>
        </prod>
        <imposto>
          <ICMS>
            <ICMS102>
              <orig>0</orig>
              <CSOSN>102</CSOSN>
            </ICMS102>
          </ICMS>
          <PIS>
            <PISOutr>
              <CST>99</CST>
              <vBC>0.00</vBC>
              <pPIS>0.0000</pPIS>
              <vPIS>0.00</vPIS>
            </PISOutr>
          </PIS>
          <COFINS>
            <COFINSOutr>
              <CST>99</CST>
              <vBC>0.00</vBC>
              <pCOFINS>0.0000</pCOFINS>
              <vCOFINS>0.00</vCOFINS>
            </COFINSOutr>
          </COFINS>
        </imposto>
      </det>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <idLote>${Date.now()}</idLote>
  <indSinc>1</indSinc>
  <NFe>
    <infNFe Id="${id}" versao="4.00">
      <ide>
        <cUF>${UF_TO_CUF[ufEmit]}</cUF>
        <cNF>${cNF}</cNF>
        <natOp>${escapeXml(nota.natureza_operacao)}</natOp>
        <mod>${mod}</mod>
        <serie>${Number(onlyDigits(serie)).toString()}</serie>
        <nNF>${Number(onlyDigits(nNF)).toString()}</nNF>
        <dhEmi>${dhEmi}</dhEmi>
        <tpNF>1</tpNF>
        <idDest>${ufDest === ufEmit ? 1 : 2}</idDest>
        <cMunFG>${cMunFG}</cMunFG>
        <tpImp>1</tpImp>
        <tpEmis>${tpEmis}</tpEmis>
        <cDV>${cDV}</cDV>
        <tpAmb>${tpAmb}</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>1</indFinal>
        <indPres>1</indPres>
        <procEmi>0</procEmi>
        <verProc>RuralNFe</verProc>
      </ide>

      <emit>
        <CNPJ>${emitCNPJ}</CNPJ>
        <xNome>${escapeXml(nota.emitente_razao)}</xNome>
        ${nota.emitente_fantasia ? `<xFant>${escapeXml(nota.emitente_fantasia)}</xFant>` : ``}
        <enderEmit>
          <xLgr>${escapeXml(nota.emitente_endereco)}</xLgr>
          <nro>${escapeXml(nota.emitente_numero)}</nro>
          <xBairro>${escapeXml(nota.emitente_bairro)}</xBairro>
          <cMun>${cMunFG}</cMun>
          <xMun>${escapeXml(municipioNome(nota.emitente_cidade))}</xMun>
          <UF>${ufEmit}</UF>
          <CEP>${escapeXml(onlyDigits(nota.emitente_cep))}</CEP>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
        </enderEmit>
        <IE>${escapeXml(onlyDigits(nota.emitente_ie))}</IE>
        <CRT>1</CRT>
      </emit>

      <dest>
        ${destIsCnpj ? `<CNPJ>${padLeft(destDoc, 14)}</CNPJ>` : `<CPF>${padLeft(destDoc, 11)}</CPF>`}
        <xNome>${escapeXml(nota.destinatario_nome)}</xNome>
        <enderDest>
          <xLgr>${escapeXml(nota.destinatario_endereco)}</xLgr>
          <nro>${escapeXml(nota.destinatario_numero)}</nro>
          <xBairro>${escapeXml(nota.destinatario_bairro)}</xBairro>
          <cMun>${cMunDest}</cMun>
          <xMun>${escapeXml(municipioNome(nota.destinatario_cidade))}</xMun>
          <UF>${ufDest}</UF>
          <CEP>${escapeXml(onlyDigits(nota.destinatario_cep))}</CEP>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
        </enderDest>
        <indIEDest>${indIEDest}</indIEDest>
        ${nota.destinatario_ie && nota.destinatario_ie.trim() ? `<IE>${escapeXml(onlyDigits(nota.destinatario_ie))}</IE>` : ``}
      </dest>

      ${detXml}

      <total>
        <ICMSTot>
          <vBC>0.00</vBC>
          <vICMS>0.00</vICMS>
          <vICMSDeson>0.00</vICMSDeson>
          <vFCP>0.00</vFCP>
          <vBCST>0.00</vBCST>
          <vST>0.00</vST>
          <vFCPST>0.00</vFCPST>
          <vFCPSTRet>0.00</vFCPSTRet>
          <vProd>${Number(totalProdutos).toFixed(2)}</vProd>
          <vFrete>0.00</vFrete>
          <vSeg>0.00</vSeg>
          <vDesc>${Number(totalDesconto).toFixed(2)}</vDesc>
          <vII>0.00</vII>
          <vIPI>0.00</vIPI>
          <vIPIDevol>0.00</vIPIDevol>
          <vPIS>0.00</vPIS>
          <vCOFINS>0.00</vCOFINS>
          <vOutro>0.00</vOutro>
          <vNF>${Number(vNF).toFixed(2)}</vNF>
          <vTotTrib>0.00</vTotTrib>
        </ICMSTot>
      </total>

      <transp>
        <modFrete>9</modFrete>
      </transp>

      ${nota.observacao && nota.observacao.trim()
        ? `<infAdic><infCpl>${escapeXml(nota.observacao)}</infCpl></infAdic>`
        : ``}
    </infNFe>
  </NFe>
</enviNFe>`;

  return xml;
}
