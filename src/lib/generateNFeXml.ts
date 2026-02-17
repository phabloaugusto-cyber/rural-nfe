// Generates a NF-e XML (layout 4.00) from saved nota data for download/reference purposes.
// This XML is NOT signed — it's a reconstruction from database fields.

function onlyDigits(s: string | null | undefined): string {
  return (s || "").replace(/\D/g, "");
}

function pad(n: number | string, len: number): string {
  return String(n).padStart(len, "0");
}

interface NotaData {
  numero: string;
  serie: string;
  data_emissao: string;
  natureza_operacao: string;
  tipo_nota: string;
  chave_acesso?: string;
  protocolo_autorizacao?: string;
  emitente_razao_social: string;
  emitente_cpf_cnpj: string;
  emitente_ie?: string;
  emitente_endereco?: string;
  emitente_cidade?: string;
  emitente_uf?: string;
  emitente_cep?: string;
  destinatario_razao_social: string;
  destinatario_cpf_cnpj: string;
  destinatario_ie?: string;
  destinatario_propriedade?: string;
  destinatario_endereco?: string;
  destinatario_cidade?: string;
  destinatario_uf?: string;
  destinatario_cep?: string;
  valor_total: number;
  observacoes?: string;
  transportador_nome?: string;
  transportador_cpf_cnpj?: string;
  transportador_placa?: string;
  transportador_uf?: string;
  transportador_rntrc?: string;
  itens: {
    codigo_sefaz?: string;
    descricao: string;
    ncm: string;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
  }[];
}

const cfopMap: Record<string, string> = {
  simples_remessa: "5923",
  retorno_origem: "5918",
  nota_entrada: "1914",
};

export function generateNFeXml(nota: NotaData): string {
  const cfop = cfopMap[nota.tipo_nota] || "5923";
  const isEntrada = cfop.startsWith("1");
  const ufEmit = (nota.emitente_uf || "GO").toUpperCase();
  const ufDest = (nota.destinatario_uf || ufEmit || "GO").toUpperCase();
  const idDest = ufEmit === ufDest ? "1" : "2";
  const chave = nota.chave_acesso || "00000000000000000000000000000000000000000000";

  const destDoc = onlyDigits(nota.destinatario_cpf_cnpj);
  const destDocTag = destDoc.length <= 11 ? "CPF" : "CNPJ";
  const destIe = onlyDigits(nota.destinatario_ie || "");
  const indIEDest = destIe ? "1" : "9";

  const dets = nota.itens.map((item, idx) => {
    const nItem = idx + 1;
    return (
      `    <det nItem="${nItem}">\n` +
      `      <prod>\n` +
      `        <cProd>${item.codigo_sefaz || pad(nItem, 5)}</cProd>\n` +
      `        <cEAN>SEM GTIN</cEAN>\n` +
      `        <xProd>${escapeXml(item.descricao)}</xProd>\n` +
      `        <NCM>${onlyDigits(item.ncm)}</NCM>\n` +
      `        <CFOP>${onlyDigits(cfop)}</CFOP>\n` +
      `        <uCom>UN</uCom>\n` +
      `        <qCom>${item.quantidade.toFixed(4)}</qCom>\n` +
      `        <vUnCom>${item.valor_unitario.toFixed(10)}</vUnCom>\n` +
      `        <vProd>${item.valor_total.toFixed(2)}</vProd>\n` +
      `        <cEANTrib>SEM GTIN</cEANTrib>\n` +
      `        <uTrib>UN</uTrib>\n` +
      `        <qTrib>${item.quantidade.toFixed(4)}</qTrib>\n` +
      `        <vUnTrib>${item.valor_unitario.toFixed(10)}</vUnTrib>\n` +
      `        <indTot>1</indTot>\n` +
      `      </prod>\n` +
      `      <imposto>\n` +
      `        <ICMS><ICMSSN102><orig>0</orig><CSOSN>102</CSOSN></ICMSSN102></ICMS>\n` +
      `        <PIS><PISAliq><CST>01</CST><vBC>0.00</vBC><pPIS>0.0000</pPIS><vPIS>0.00</vPIS></PISAliq></PIS>\n` +
      `        <COFINS><COFINSAliq><CST>01</CST><vBC>0.00</vBC><pCOFINS>0.0000</pCOFINS><vCOFINS>0.00</vCOFINS></COFINSAliq></COFINS>\n` +
      `      </imposto>\n` +
      `    </det>`
    );
  }).join("\n");

  const modFrete = nota.transportador_nome ? (isEntrada ? "0" : "1") : "9";
  let transpBlock = `    <transp>\n      <modFrete>${modFrete}</modFrete>\n`;
  if (nota.transportador_nome && !isEntrada) {
    const tDoc = onlyDigits(nota.transportador_cpf_cnpj || "");
    const tDocTag = tDoc.length <= 11 ? "CPF" : "CNPJ";
    transpBlock += `      <transporta>\n`;
    if (tDoc) transpBlock += `        <${tDocTag}>${tDoc}</${tDocTag}>\n`;
    transpBlock += `        <xNome>${escapeXml(nota.transportador_nome)}</xNome>\n`;
    transpBlock += `        <UF>${nota.transportador_uf || ufEmit}</UF>\n`;
    transpBlock += `      </transporta>\n`;
    if (nota.transportador_placa) {
      transpBlock += `      <veicTransp>\n`;
      transpBlock += `        <placa>${nota.transportador_placa}</placa>\n`;
      transpBlock += `        <UF>${nota.transportador_uf || ufEmit}</UF>\n`;
      if (nota.transportador_rntrc) transpBlock += `        <RNTC>${nota.transportador_rntrc}</RNTC>\n`;
      transpBlock += `      </veicTransp>\n`;
    }
  }
  transpBlock += `    </transp>`;

  const infAdic = nota.observacoes
    ? `    <infAdic>\n      <infCpl>${escapeXml(nota.observacoes)}</infCpl>\n    </infAdic>\n`
    : "";

  const protBlock = nota.protocolo_autorizacao
    ? `\n  <protNFe versao="4.00">\n    <infProt>\n      <tpAmb>1</tpAmb>\n      <chNFe>${chave}</chNFe>\n      <nProt>${nota.protocolo_autorizacao}</nProt>\n      <cStat>100</cStat>\n      <xMotivo>Autorizado o uso da NF-e</xMotivo>\n    </infProt>\n  </protNFe>`
    : "";

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">\n` +
    `  <NFe>\n` +
    `  <infNFe versao="4.00" Id="NFe${chave}">\n` +
    `    <ide>\n` +
    `      <cUF>52</cUF>\n` +
    `      <natOp>${escapeXml(nota.natureza_operacao)}</natOp>\n` +
    `      <mod>55</mod>\n` +
    `      <serie>${nota.serie}</serie>\n` +
    `      <nNF>${nota.numero}</nNF>\n` +
    `      <dhEmi>${nota.data_emissao}T00:00:00-03:00</dhEmi>\n` +
    `      <tpNF>${isEntrada ? "0" : "1"}</tpNF>\n` +
    `      <idDest>${idDest}</idDest>\n` +
    `      <tpAmb>1</tpAmb>\n` +
    `      <finNFe>1</finNFe>\n` +
    `      <indFinal>0</indFinal>\n` +
    `      <indPres>0</indPres>\n` +
    `    </ide>\n` +
    `    <emit>\n` +
    `      <CNPJ>${pad(onlyDigits(nota.emitente_cpf_cnpj), 14)}</CNPJ>\n` +
    `      <xNome>${escapeXml(nota.emitente_razao_social)}</xNome>\n` +
    `      <enderEmit>\n` +
    `        <xLgr>${escapeXml(nota.emitente_endereco || "")}</xLgr>\n` +
    `        <nro>S/N</nro>\n` +
    `        <xBairro>Centro</xBairro>\n` +
    `        <xMun>${escapeXml(nota.emitente_cidade || "")}</xMun>\n` +
    `        <UF>${ufEmit}</UF>\n` +
    `        <CEP>${onlyDigits(nota.emitente_cep) || "00000000"}</CEP>\n` +
    `      </enderEmit>\n` +
    `      <IE>${onlyDigits(nota.emitente_ie || "")}</IE>\n` +
    `      <CRT>1</CRT>\n` +
    `    </emit>\n` +
    `    <dest>\n` +
    `      <${destDocTag}>${pad(destDoc, destDocTag === "CPF" ? 11 : 14)}</${destDocTag}>\n` +
    `      <xNome>${escapeXml(nota.destinatario_razao_social)}</xNome>\n` +
    `      <enderDest>\n` +
    `        <xLgr>${escapeXml(nota.destinatario_endereco || nota.destinatario_propriedade || "Zona Rural")}</xLgr>\n` +
    `        <nro>S/N</nro>\n` +
    `        <xBairro>Zona Rural</xBairro>\n` +
    `        <xMun>${escapeXml(nota.destinatario_cidade || "")}</xMun>\n` +
    `        <UF>${ufDest}</UF>\n` +
    `        <CEP>${onlyDigits(nota.destinatario_cep) || "00000000"}</CEP>\n` +
    `      </enderDest>\n` +
    `      <indIEDest>${indIEDest}</indIEDest>\n` +
    (destIe ? `      <IE>${destIe}</IE>\n` : "") +
    `    </dest>\n` +
    dets + "\n" +
    `    <total>\n` +
    `      <ICMSTot>\n` +
    `        <vBC>0.00</vBC><vICMS>0.00</vICMS><vICMSDeson>0.00</vICMSDeson>\n` +
    `        <vFCP>0.00</vFCP><vBCST>0.00</vBCST><vST>0.00</vST>\n` +
    `        <vProd>${nota.valor_total.toFixed(2)}</vProd>\n` +
    `        <vFrete>0.00</vFrete><vSeg>0.00</vSeg><vDesc>0.00</vDesc>\n` +
    `        <vII>0.00</vII><vIPI>0.00</vIPI><vIPIDevol>0.00</vIPIDevol>\n` +
    `        <vPIS>0.00</vPIS><vCOFINS>0.00</vCOFINS><vOutro>0.00</vOutro>\n` +
    `        <vNF>${nota.valor_total.toFixed(2)}</vNF>\n` +
    `      </ICMSTot>\n` +
    `    </total>\n` +
    transpBlock + "\n" +
    `    <pag><detPag><tPag>90</tPag><vPag>0.00</vPag></detPag></pag>\n` +
    infAdic +
    `  </infNFe>\n` +
    `  </NFe>` +
    protBlock + "\n" +
    `</nfeProc>`;

  return xml;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
