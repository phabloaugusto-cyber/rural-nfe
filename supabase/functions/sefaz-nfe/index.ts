import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import forge from "npm:node-forge@1.3.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CUF = "52"; // Goiás

const SEFAZ_URLS: Record<string, string> = {
  "1": "https://nfe.sefaz.go.gov.br/nfe/services/NFeAutorizacao4",
  "2": "https://homolog.sefaz.go.gov.br/nfe/services/NFeAutorizacao4",
};

// ─── PFX Parsing ───
function parsePfx(pfxBytes: Uint8Array, password: string) {
  const pfxDer = forge.util.createBuffer(pfxBytes);
  const pfxAsn1 = forge.asn1.fromDer(pfxDer);
  const pkcs12 = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, password);

  const certBags = pkcs12.getBags({ bagType: forge.pki.oids.certBag });
  const certBag = certBags[forge.pki.oids.certBag];
  if (!certBag || certBag.length === 0 || !certBag[0].cert) throw new Error("Certificado não encontrado no PFX");

  const keyBags = pkcs12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];
  if (!keyBag || keyBag.length === 0 || !keyBag[0].key) throw new Error("Chave privada não encontrada no PFX");

  const cert = certBag[0].cert;
  const key = keyBag[0].key as forge.pki.rsa.PrivateKey;
  const certDerBytes = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
  const certPem = forge.pki.certificateToPem(cert);
  const keyPem = forge.pki.privateKeyToPem(key);

  return { cert, key, certDerBytes, certPem, keyPem };
}

// ─── Crypto Helpers ───
function sha1Base64(data: string): string {
  const md = forge.md.sha1.create();
  md.update(data, "utf8");
  return forge.util.encode64(md.digest().getBytes());
}

function rsaSha1Sign(data: string, privateKey: forge.pki.rsa.PrivateKey): string {
  const md = forge.md.sha1.create();
  md.update(data, "utf8");
  const sig = (privateKey as any).sign(md);
  return forge.util.encode64(sig);
}

// ─── XML Signing ───
function signXml(xmlToSign: string, refUri: string, privateKey: forge.pki.rsa.PrivateKey, certDerBytes: string): string {
  // C14N requires:
  // 1. For digest: canonicalize infNFe with inherited xmlns and sorted attributes
  // 2. For signature: canonicalize SignedInfo with expanded self-closing tags
  //    (C14N spec: empty elements MUST use start-tag/end-tag, NOT self-closing tags)
  
  // Canonical form of infNFe: add inherited xmlns, sort attrs (Id before versao)
  const canonicalXml = xmlToSign.replace(
    /^<infNFe\s+versao="([^"]*)" Id="([^"]*)"/,
    '<infNFe xmlns="http://www.portalfiscal.inf.br/nfe" Id="$2" versao="$1"'
  );
  const digestValue = sha1Base64(canonicalXml);

  // Build SignedInfo with EXPANDED empty elements (C14N requirement)
  // Self-closing <tag/> must be <tag></tag> in canonical form
  const signedInfo =
    `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">` +
    `<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></CanonicalizationMethod>` +
    `<SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"></SignatureMethod>` +
    `<Reference URI="#${refUri}">` +
    `<Transforms>` +
    `<Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"></Transform>` +
    `<Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></Transform>` +
    `</Transforms>` +
    `<DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></DigestMethod>` +
    `<DigestValue>${digestValue}</DigestValue>` +
    `</Reference>` +
    `</SignedInfo>`;

  const signatureValue = rsaSha1Sign(signedInfo, privateKey);
  const x509Cert = forge.util.encode64(certDerBytes);

  return (
    `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">` +
    signedInfo +
    `<SignatureValue>${signatureValue}</SignatureValue>` +
    `<KeyInfo><X509Data><X509Certificate>${x509Cert}</X509Certificate></X509Data></KeyInfo>` +
    `</Signature>`
  );
}

// ─── Helpers ───
function pad(n: number | string, len: number): string {
  return String(n).padStart(len, "0");
}

function sefazDateTime(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "-03:00");
}

function onlyDigits(s: string | null | undefined): string {
  return (s || "").replace(/\D/g, "");
}

// ─── Chave de Acesso (44 dígitos) ───
function gerarChaveAcesso(params: {
  cUF: string; aamm: string; cnpj: string; mod: string;
  serie: string; nNF: string; tpEmis: string; cNF: string;
}): string {
  const { cUF, aamm, cnpj, mod, serie, nNF, tpEmis, cNF } = params;
  const semDV = `${cUF}${aamm}${pad(cnpj, 14)}${mod}${pad(serie, 3)}${pad(nNF, 9)}${tpEmis}${pad(cNF, 8)}`;
  const dv = calcularDV(semDV);
  return semDV + dv;
}

function calcularDV(chave: string): string {
  const pesos = [2, 3, 4, 5, 6, 7, 8, 9];
  let soma = 0;
  for (let i = chave.length - 1, p = 0; i >= 0; i--, p++) {
    soma += parseInt(chave[i]) * pesos[p % 8];
  }
  const resto = soma % 11;
  return resto < 2 ? "0" : String(11 - resto);
}

function formatarChaveAcesso(chave: string): string {
  return chave.replace(/(\d{4})(?=\d)/g, "$1 ");
}

// ─── Build NF-e XML ───
function buildNFeXml(params: {
  chaveAcesso: string;
  cNF: string;
  ambiente: string;
  numero: string;
  serie: string;
  dataEmissao: string;
  naturezaOperacao: string;
  tipoNota: string;
  emitente: {
    cnpj: string; razaoSocial: string; ie: string;
    endereco: string; cidade: string; uf: string; cep: string;
  };
  destinatario: {
    cpfCnpj: string; razaoSocial: string; ie: string;
    propriedade: string; endereco: string; cidade: string; uf: string; cep: string;
  };
  itens: {
    numero: number; codigoSefaz: string; descricao: string; ncm: string;
    quantidade: number; valorUnitario: number; valorTotal: number;
  }[];
  valorTotal: number;
  informacoesAdicionais: string;
  transportador?: {
    nome: string; cpfCnpj?: string; placa: string; uf: string; rntrc?: string;
  };
  cfop: string;
  chaveNfeReferenciada?: string;
}): string {
  const {
    chaveAcesso, cNF, ambiente, numero, serie, dataEmissao,
    naturezaOperacao, emitente, destinatario, itens,
    valorTotal, informacoesAdicionais, transportador, cfop,
  } = params;

  // Gerar hora local BRT (UTC-3) corretamente
  const now = new Date();
  const brtTime = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const timeStr = brtTime.toISOString().substring(11, 19);
  const dhEmi = `${dataEmissao}T${timeStr}-03:00`;
  const dhSaiEnt = dhEmi;

  // Determine indFinal and idDest based on UFs
  const ufEmit = (emitente.uf || "GO").toUpperCase();
  const ufDest = (destinatario.uf || "").toUpperCase();
  // Use the same fallback logic as destUfFinal for idDest comparison
  const ufDestEfetiva = ufDest || ufEmit || "GO";
  const idDest = ufEmit === ufDestEfetiva ? "1" : "2"; // 1=interna, 2=interestadual

  // Determine if dest is CPF or CNPJ
  const destDocDigits = onlyDigits(destinatario.cpfCnpj);
  const destDocTag = destDocDigits.length <= 11 ? "CPF" : "CNPJ";

  // cMunFG - use IBGE code for emitente city (simplified - using 5208707 for Goiânia/default GO)
  // In production this should be mapped properly
  const cMunFG = "5204300"; // Caiapônia-GO default, should be dynamic

  // Check if this is a devolução/retorno - needs NFref and finNFe=4
  const cfopDigits = onlyDigits(cfop);
  const isDevolucao = cfopDigits === "5918";
  const finNFe = isDevolucao ? "4" : "1";

  // Extract referenced NF-e key: prefer direct parameter, fallback to regex from infAdic
  let nfRefBlock = "";
  if (isDevolucao) {
    const chaveRef = params.chaveNfeReferenciada || (() => {
      const m = informacoesAdicionais?.match(/Chave de Acesso[^:]*:\s*(\d{44})/i);
      return m?.[1] || "";
    })();
    if (chaveRef && chaveRef.length === 44) {
      nfRefBlock = `<NFref><refNFe>${chaveRef}</refNFe></NFref>`;
    }
  }

  // Build ide — NFref must come after nNF and before dhEmi per NF-e schema
  const ide =
    `<ide>` +
    `<cUF>${CUF}</cUF>` +
    `<cNF>${pad(cNF, 8)}</cNF>` +
    `<natOp>${naturezaOperacao}</natOp>` +
    `<mod>55</mod>` +
    `<serie>${serie}</serie>` +
    `<nNF>${numero}</nNF>` +
    `<dhEmi>${dhEmi}</dhEmi>` +
    `<dhSaiEnt>${dhSaiEnt}</dhSaiEnt>` +
    `<tpNF>${cfop.startsWith("1") ? "0" : "1"}</tpNF>` +
    `<idDest>${idDest}</idDest>` +
    `<cMunFG>${cMunFG}</cMunFG>` +
    `<tpImp>1</tpImp>` +
    `<tpEmis>1</tpEmis>` +
    `<cDV>${chaveAcesso.slice(-1)}</cDV>` +
    `<tpAmb>${ambiente}</tpAmb>` +
    `<finNFe>${finNFe}</finNFe>` +
    `<indFinal>0</indFinal>` +
    `<indPres>0</indPres>` +
    `<procEmi>0</procEmi>` +
    `<verProc>1.0.0</verProc>` +
    nfRefBlock +
    `</ide>`;

  // Build emit
  const emitCnpj = onlyDigits(emitente.cnpj);
  const emit =
    `<emit>` +
    `<CNPJ>${pad(emitCnpj, 14)}</CNPJ>` +
    `<xNome>${emitente.razaoSocial}</xNome>` +
    `<enderEmit>` +
    `<xLgr>${emitente.endereco || "Rua nao informada"}</xLgr>` +
    `<nro>S/N</nro>` +
    `<xBairro>Centro</xBairro>` +
    `<cMun>${cMunFG}</cMun>` +
    `<xMun>${emitente.cidade || "Caiaponia"}</xMun>` +
    `<UF>${ufEmit}</UF>` +
    `<CEP>${onlyDigits(emitente.cep) || "00000000"}</CEP>` +
    `<cPais>1058</cPais>` +
    `<xPais>BRASIL</xPais>` +
    `</enderEmit>` +
    `<IE>${onlyDigits(emitente.ie)}</IE>` +
    `<CRT>1</CRT>` + // Simples Nacional
    `</emit>`;

  // Build dest
  const destDoc = onlyDigits(destinatario.cpfCnpj);
  // cMunDest - simplified
  const cMunDest = "5217609"; // default, should be dynamic
  const destIeDigits = onlyDigits(destinatario.ie);
  const destUfFinal = ufDest || ufEmit || "GO"; // fallback to emitente UF
  const indIEDest = destIeDigits ? "1" : "9"; // 1=contribuinte, 9=não contribuinte
  const destIeTag = destIeDigits ? `<IE>${destIeDigits}</IE>` : "";
  const dest =
    `<dest>` +
    `<${destDocTag}>${pad(destDoc, destDocTag === "CPF" ? 11 : 14)}</${destDocTag}>` +
    `<xNome>${destinatario.razaoSocial}</xNome>` +
    `<enderDest>` +
    `<xLgr>${destinatario.endereco || destinatario.propriedade || "Zona Rural"}</xLgr>` +
    `<nro>S/N</nro>` +
    `<xBairro>Zona Rural</xBairro>` +
    `<cMun>${cMunDest}</cMun>` +
    `<xMun>${destinatario.cidade || "Nao Informado"}</xMun>` +
    `<UF>${destUfFinal}</UF>` +
    `<CEP>${onlyDigits(destinatario.cep) || "00000000"}</CEP>` +
    `<cPais>1058</cPais>` +
    `<xPais>BRASIL</xPais>` +
    `</enderDest>` +
    `<indIEDest>${indIEDest}</indIEDest>` +
    destIeTag +
    `</dest>`;

  // Build det (items)
  const dets = itens.map((item) => {
    const vProd = item.valorTotal.toFixed(2);
    const vUnCom = item.valorUnitario.toFixed(10);
    const qCom = item.quantidade.toFixed(4);

    return (
      `<det nItem="${item.numero}">` +
      `<prod>` +
      `<cProd>${item.codigoSefaz || pad(item.numero, 5)}</cProd>` +
      `<cEAN>SEM GTIN</cEAN>` +
      `<xProd>${item.descricao}</xProd>` +
      `<NCM>${onlyDigits(item.ncm)}</NCM>` +
      `<CFOP>${onlyDigits(cfop)}</CFOP>` +
      `<uCom>UN</uCom>` +
      `<qCom>${qCom}</qCom>` +
      `<vUnCom>${vUnCom}</vUnCom>` +
      `<vProd>${vProd}</vProd>` +
      `<cEANTrib>SEM GTIN</cEANTrib>` +
      `<uTrib>UN</uTrib>` +
      `<qTrib>${qCom}</qTrib>` +
      `<vUnTrib>${vUnCom}</vUnTrib>` +
      `<indTot>1</indTot>` +
      `</prod>` +
      `<imposto>` +
      `<ICMS>` +
      `<ICMSSN102>` +
      `<orig>0</orig>` +
      `<CSOSN>102</CSOSN>` +
      `</ICMSSN102>` +
      `</ICMS>` +
      `<PIS><PISAliq><CST>01</CST><vBC>0.00</vBC><pPIS>0.0000</pPIS><vPIS>0.00</vPIS></PISAliq></PIS>` +
      `<COFINS><COFINSAliq><CST>01</CST><vBC>0.00</vBC><pCOFINS>0.0000</pCOFINS><vCOFINS>0.00</vCOFINS></COFINSAliq></COFINS>` +
      `</imposto>` +
      `</det>`
    );
  }).join("");

  // Build total
  const vProdTotal = valorTotal.toFixed(2);
  const total =
    `<total>` +
    `<ICMSTot>` +
    `<vBC>0.00</vBC>` +
    `<vICMS>0.00</vICMS>` +
    `<vICMSDeson>0.00</vICMSDeson>` +
    `<vFCPUFDest>0.00</vFCPUFDest>` +
    `<vICMSUFDest>0.00</vICMSUFDest>` +
    `<vICMSUFRemet>0.00</vICMSUFRemet>` +
    `<vFCP>0.00</vFCP>` +
    `<vBCST>0.00</vBCST>` +
    `<vST>0.00</vST>` +
    `<vFCPST>0.00</vFCPST>` +
    `<vFCPSTRet>0.00</vFCPSTRet>` +
    `<vProd>${vProdTotal}</vProd>` +
    `<vFrete>0.00</vFrete>` +
    `<vSeg>0.00</vSeg>` +
    `<vDesc>0.00</vDesc>` +
    `<vII>0.00</vII>` +
    `<vIPI>0.00</vIPI>` +
    `<vIPIDevol>0.00</vIPIDevol>` +
    `<vPIS>0.00</vPIS>` +
    `<vCOFINS>0.00</vCOFINS>` +
    `<vOutro>0.00</vOutro>` +
    `<vNF>${vProdTotal}</vNF>` +
    `</ICMSTot>` +
    `</total>`;

  // Build transp
  // modFrete: 0=Emitente, 1=Destinatário/Remetente, 9=Sem frete
  // Entrada: 0 (Emitente), Simples Remessa/Retorno: 1 (Destinatário)
  // cStat 868: Para nota de entrada, grupos Veículo Transporte e Reboque não devem ser informados
  const isEntrada = cfop.startsWith("1");
  let modFrete = "9";
  if (transportador) {
    modFrete = isEntrada ? "0" : "1";
  }
  let transp = `<transp><modFrete>${modFrete}</modFrete>`;
  if (transportador && !isEntrada) {
    const transpDocDigits = onlyDigits(transportador.cpfCnpj || "");
    transp += `<transporta>`;
    if (transpDocDigits.length > 0) {
      const transpDocTag = transpDocDigits.length <= 11 ? "CPF" : "CNPJ";
      transp += `<${transpDocTag}>${transpDocDigits}</${transpDocTag}>`;
    }
    transp += `<xNome>${transportador.nome}</xNome>`;
    transp += `<UF>${transportador.uf}</UF>`;
    transp += `</transporta>`;
    if (transportador.placa) {
      transp += `<veicTransp>`;
      transp += `<placa>${transportador.placa}</placa>`;
      transp += `<UF>${transportador.uf}</UF>`;
      if (transportador.rntrc) transp += `<RNTC>${transportador.rntrc}</RNTC>`;
      transp += `</veicTransp>`;
    }
  }
  transp += `</transp>`;

  // pag (obrigatório no layout 4.00)
  const pag =
    `<pag>` +
    `<detPag>` +
    `<tPag>90</tPag>` + // 90 = Sem pagamento
    `<vPag>0.00</vPag>` +
    `</detPag>` +
    `</pag>`;

  // infAdic
  const infAdic = informacoesAdicionais
    ? `<infAdic><infCpl>${informacoesAdicionais.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/[\r\n]+/g, "; ").replace(/\s{2,}/g, " ").trim()}</infCpl></infAdic>`
    : "";

  // Build infNFe
  const infNFeId = `NFe${chaveAcesso}`;
  const infNFe =
    `<infNFe versao="4.00" Id="${infNFeId}">` +
    ide + emit + dest + dets + total + transp + pag + infAdic +
    `</infNFe>`;

  return infNFe;
}

// ─── SOAP Envelope for NFeAutorizacao ───
function wrapSoapAutorizacao(body: string): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope" xmlns:nfe="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">` +
    `<soap12:Body><nfe:nfeAutorizacaoLote><nfeDadosMsg>` +
    body +
    `</nfeDadosMsg></nfe:nfeAutorizacaoLote></soap12:Body></soap12:Envelope>`
  );
}

// ─── Send SOAP to SEFAZ (via proxy mTLS) ───
async function sendToSefaz(url: string, soapXml: string, certPem: string, keyPem: string): Promise<string> {
  const proxyUrl = Deno.env.get("SEFAZ_PROXY_URL");

  if (proxyUrl) {
    // Use proxy mTLS
    console.log(`Usando proxy mTLS: ${proxyUrl}`);
    const proxySecret = Deno.env.get("SEFAZ_PROXY_SECRET") || "";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (proxySecret) {
      headers["x-proxy-token"] = proxySecret;
    }

    const response = await fetch(proxyUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        sefaz_url: url,
        soap_xml: soapXml,
        cert_pem: certPem,
        key_pem: keyPem,
      }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || `Proxy retornou status ${response.status}`);
    }
    return result.responseXml;
  }

  // Fallback: tentativa direta (provavelmente falhará com HandshakeFailure)
  console.warn("SEFAZ_PROXY_URL não configurada. Tentando conexão direta...");
  let response: Response;
  try {
    // @ts-ignore - Deno API for mTLS
    const client = Deno.createHttpClient({ certChain: certPem, privateKey: keyPem });
    response = await fetch(url, {
      // @ts-ignore
      client,
      method: "POST",
      headers: { "Content-Type": "application/soap+xml; charset=utf-8" },
      body: soapXml,
    });
  } catch (mtlsError) {
    console.error("mTLS error, trying without:", mtlsError);
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/soap+xml; charset=utf-8" },
      body: soapXml,
    });
  }
  return await response.text();
}

// ─── Parse Response ───
function extractFromXml(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i");
  const match = xml.match(regex);
  return match?.[1] || "";
}

function parseAutorizacaoResponse(xml: string) {
  return {
    cStat: extractFromXml(xml, "cStat"),
    xMotivo: extractFromXml(xml, "xMotivo"),
    nProt: extractFromXml(xml, "nProt"),
    dhRecbto: extractFromXml(xml, "dhRecbto"),
    chNFe: extractFromXml(xml, "chNFe"),
    digVal: extractFromXml(xml, "digVal"),
  };
}

// ─── Main Handler ───
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      emitente_id,
      cert_senha,
      ambiente = "1",
      nota_fiscal_id,
      // NF-e data
      numero,
      serie,
      data_emissao,
      natureza_operacao,
      tipo_nota,
      cfop,
      emitente_data,
      destinatario_data,
      itens,
      valor_total,
      informacoes_adicionais,
      chave_nfe_referenciada,
      transportador_data,
    } = body;

    if (!emitente_id || !cert_senha || !nota_fiscal_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Parâmetros obrigatórios: emitente_id, cert_senha, nota_fiscal_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get emitente
    const { data: emitente, error: emError } = await supabase
      .from("emitentes").select("*").eq("id", emitente_id).maybeSingle();

    if (emError || !emitente) {
      return new Response(
        JSON.stringify({ success: false, error: "Emitente não encontrado." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!emitente.cert_file_path) {
      return new Response(
        JSON.stringify({ success: false, error: "Certificado digital não configurado." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download certificate
    const { data: certFile, error: certError } = await supabase.storage
      .from("certificados").download(emitente.cert_file_path);

    if (certError || !certFile) {
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao baixar certificado: " + certError?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse PFX
    let pfxData;
    try {
      const pfxBytes = new Uint8Array(await certFile.arrayBuffer());
      pfxData = parsePfx(pfxBytes, cert_senha);
    } catch (pfxError: any) {
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao abrir certificado. Verifique a senha. " + pfxError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cnpj = onlyDigits(emitente.cpf_cnpj);

    // Generate cNF (random 8-digit code)
    const cNF = pad(Math.floor(Math.random() * 99999999), 8);

    // Generate date for chave (AAMM)
    const [year, month] = data_emissao.split("-");
    const aamm = year.slice(2) + month;

    // Generate chave de acesso
    const chaveAcesso = gerarChaveAcesso({
      cUF: CUF,
      aamm,
      cnpj: pad(cnpj, 14),
      mod: "55",
      serie: pad(serie, 3),
      nNF: pad(numero, 9),
      tpEmis: "1",
      cNF,
    });

    console.log("Chave de acesso gerada:", chaveAcesso);

    // Build NF-e XML
    const mappedItens = (itens || []).map((item: any, idx: number) => ({
      numero: idx + 1,
      codigoSefaz: item.codigoSefaz || item.codigo_sefaz || "",
      descricao: item.descricao,
      ncm: item.ncm,
      quantidade: item.quantidade,
      valorUnitario: item.valorUnitario || item.valor_unitario,
      valorTotal: item.valorTotal || item.valor_total,
    }));

    const infNFe = buildNFeXml({
      chaveAcesso,
      cNF,
      ambiente,
      numero,
      serie,
      dataEmissao: data_emissao,
      naturezaOperacao: natureza_operacao,
      tipoNota: tipo_nota,
      emitente: {
        cnpj,
        razaoSocial: emitente_data.razaoSocial || emitente_data.razao_social || emitente_data.emitente_razao_social || emitente.razao_social,
        ie: emitente_data.ie || emitente_data.inscricao_estadual || emitente_data.emitente_ie || emitente.inscricao_estadual || "",
        endereco: emitente_data.endereco || emitente_data.emitente_endereco || emitente.endereco || "",
        cidade: emitente_data.cidade || emitente_data.emitente_cidade || emitente.cidade || "",
        uf: emitente_data.uf || emitente_data.emitente_uf || emitente.uf || "",
        cep: emitente_data.cep || emitente_data.emitente_cep || emitente.cep || "",
      },
      destinatario: {
        cpfCnpj: destinatario_data.cpfCnpj || destinatario_data.cpf_cnpj || destinatario_data.destinatario_cpf_cnpj || "",
        razaoSocial: destinatario_data.razaoSocial || destinatario_data.razao_social || destinatario_data.destinatario_razao_social || "",
        ie: destinatario_data.ie || destinatario_data.inscricao_estadual || destinatario_data.destinatario_ie || "",
        propriedade: destinatario_data.propriedade || destinatario_data.destinatario_propriedade || "",
        endereco: destinatario_data.endereco || destinatario_data.destinatario_endereco || "",
        cidade: destinatario_data.cidade || destinatario_data.destinatario_cidade || "",
        uf: destinatario_data.uf || destinatario_data.destinatario_uf || "",
        cep: destinatario_data.cep || destinatario_data.destinatario_cep || "",
      },
      itens: mappedItens,
      valorTotal: valor_total,
      informacoesAdicionais: informacoes_adicionais || "",
      transportador: transportador_data ? {
        nome: transportador_data.nome,
        cpfCnpj: transportador_data.cpfCnpj || transportador_data.cpf_cnpj,
        placa: transportador_data.placa || "",
        uf: transportador_data.uf || "",
        rntrc: transportador_data.rntrc || "",
      } : undefined,
      cfop,
      chaveNfeReferenciada: chave_nfe_referenciada || undefined,
    });

    // Sign the XML
    const infNFeId = `NFe${chaveAcesso}`;
    const signature = signXml(infNFe, infNFeId, pfxData.key, pfxData.certDerBytes);

    // Build complete enviNFe
    const nfeXml =
      `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">` +
      `<idLote>${Date.now()}</idLote>` +
      `<indSinc>1</indSinc>` + // Síncrono
      `<NFe>` +
      infNFe +
      signature +
      `</NFe>` +
      `</enviNFe>`;

    const soapXml = wrapSoapAutorizacao(nfeXml);
    const sefazUrl = SEFAZ_URLS[ambiente];

    console.log(`NF-e preparada. SOAP XML length: ${soapXml.length}`);
    console.log(`XML_PART1: ${infNFe.substring(0, 2000)}`);
    console.log(`XML_PART2: ${infNFe.substring(2000, 4000)}`);
    console.log(`XML_PART3: ${infNFe.substring(4000)}`);

    // Check if prepare_only mode (frontend will transmit via localhost proxy)
    const prepareOnly = body.prepare_only === true;
    if (prepareOnly) {
      return new Response(
        JSON.stringify({
          success: true,
          mode: "prepare",
          sefaz_url: sefazUrl,
          soap_xml: soapXml,
          cert_pem: pfxData.certPem,
          key_pem: pfxData.keyPem,
          chave_acesso: chaveAcesso,
          chave_formatada: formatarChaveAcesso(chaveAcesso),
          nota_fiscal_id,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Legacy mode: edge function transmits via proxy
    const responseXml = await sendToSefaz(sefazUrl, soapXml, pfxData.certPem, pfxData.keyPem);
    console.log("SEFAZ Response:", responseXml.substring(0, 1000));

    const result = parseAutorizacaoResponse(responseXml);

    // 100 = Autorizado, 104 = Lote processado
    const successCodes = ["100", "104"];
    const isSuccess = successCodes.includes(result.cStat);

    if (isSuccess && result.nProt) {
      // Update nota_fiscal with chave_acesso and protocolo
      await supabase
        .from("notas_fiscais")
        .update({
          chave_acesso: chaveAcesso,
          protocolo_autorizacao: result.nProt,
          status: "emitida",
        })
        .eq("id", nota_fiscal_id);

      console.log(`NF-e autorizada! Chave: ${chaveAcesso}, Protocolo: ${result.nProt}`);
    }

    return new Response(
      JSON.stringify({
        success: isSuccess,
        cStat: result.cStat,
        xMotivo: result.xMotivo,
        nProt: result.nProt || null,
        chaveAcesso: isSuccess ? chaveAcesso : null,
        chaveFormatada: isSuccess ? formatarChaveAcesso(chaveAcesso) : null,
        responseXml: responseXml.substring(0, 2000),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Erro no sefaz-nfe:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
