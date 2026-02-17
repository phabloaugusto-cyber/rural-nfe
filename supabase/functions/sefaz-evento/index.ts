import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import forge from "npm:node-forge@1.3.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// SEFAZ GO (cUF = 52)
const CUF = "52";
const SEFAZ_URLS: Record<string, Record<string, string>> = {
  "1": {
    recepcaoEvento: "https://nfe.sefaz.go.gov.br/nfe/services/NFeRecepcaoEvento4",
    inutilizacao: "https://nfe.sefaz.go.gov.br/nfe/services/NFeInutilizacao4",
  },
  "2": {
    recepcaoEvento: "https://homolog.sefaz.go.gov.br/nfe/services/NFeRecepcaoEvento4",
    inutilizacao: "https://homolog.sefaz.go.gov.br/nfe/services/NFeInutilizacao4",
  },
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
function signXml(
  xmlToSign: string,
  refUri: string,
  privateKey: forge.pki.rsa.PrivateKey,
  certDerBytes: string
): string {
  // Digest of the element being signed
  const digestValue = sha1Base64(xmlToSign);

  // SignedInfo
  const signedInfo =
    `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">` +
    `<CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>` +
    `<SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>` +
    `<Reference URI="#${refUri}">` +
    `<Transforms>` +
    `<Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>` +
    `<Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>` +
    `</Transforms>` +
    `<DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>` +
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

// ─── Date Helper ───
function sefazDateTime(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "-03:00");
}

function padLeft(n: number | string, len: number): string {
  return String(n).padStart(len, "0");
}

// ─── Evento XML (Cancelamento / CC-e) ───
function buildEventoXml(params: {
  tpAmb: string;
  cnpj: string;
  chNFe: string;
  tpEvento: string;
  nSeqEvento: number;
  detEvento: string;
}) {
  const { tpAmb, cnpj, chNFe, tpEvento, nSeqEvento, detEvento } = params;
  const eventId = `ID${tpEvento}${chNFe}${padLeft(nSeqEvento, 2)}`;

  const infEvento =
    `<infEvento xmlns="http://www.portalfiscal.inf.br/nfe" Id="${eventId}">` +
    `<cOrgao>${CUF}</cOrgao>` +
    `<tpAmb>${tpAmb}</tpAmb>` +
    `<CNPJ>${cnpj}</CNPJ>` +
    `<chNFe>${chNFe}</chNFe>` +
    `<dhEvento>${sefazDateTime()}</dhEvento>` +
    `<tpEvento>${tpEvento}</tpEvento>` +
    `<nSeqEvento>${nSeqEvento}</nSeqEvento>` +
    `<verEvento>1.00</verEvento>` +
    `<detEvento versao="1.00">${detEvento}</detEvento>` +
    `</infEvento>`;

  return { infEvento, eventId };
}

function buildCancelamentoDetEvento(nProt: string, xJust: string): string {
  return `<descEvento>Cancelamento</descEvento><nProt>${nProt}</nProt><xJust>${xJust}</xJust>`;
}

function buildCartaCorrecaoDetEvento(xCorrecao: string): string {
  const xCondUso =
    "A Carta de Correcao e disciplinada pelo paragrafo 1o-A do art. 7o do Convenio S/N, " +
    "de 15 de dezembro de 1970 e pode ser utilizada para regularizacao de erro ocorrido na emissao de " +
    "documento fiscal, desde que o erro nao esteja relacionado com: I - as variaveis que determinam o valor " +
    "do imposto tais como: base de calculo, aliquota, diferenca de preco, quantidade, valor da operacao ou " +
    "da prestacao; II - a correcao de dados cadastrais que implique mudanca do remetente ou do destinatario; " +
    "III - a data de emissao ou de saida.";
  return `<descEvento>Carta de Correcao</descEvento><xCorrecao>${xCorrecao}</xCorrecao><xCondUso>${xCondUso}</xCondUso>`;
}

// ─── Inutilização XML ───
function buildInutilizacaoXml(params: {
  tpAmb: string;
  cnpj: string;
  ano: number;
  serie: string;
  nNFIni: number;
  nNFFin: number;
  xJust: string;
}) {
  const { tpAmb, cnpj, ano, serie, nNFIni, nNFFin, xJust } = params;
  const anoStr = padLeft(ano % 100, 2);
  const inutId = `ID${CUF}${anoStr}${cnpj}55${padLeft(serie, 3)}${padLeft(nNFIni, 9)}${padLeft(nNFFin, 9)}`;

  const infInut =
    `<infInut xmlns="http://www.portalfiscal.inf.br/nfe" Id="${inutId}">` +
    `<tpAmb>${tpAmb}</tpAmb>` +
    `<xServ>INUTILIZAR</xServ>` +
    `<cUF>${CUF}</cUF>` +
    `<ano>${anoStr}</ano>` +
    `<CNPJ>${cnpj}</CNPJ>` +
    `<mod>55</mod>` +
    `<serie>${serie}</serie>` +
    `<nNFIni>${nNFIni}</nNFIni>` +
    `<nNFFin>${nNFFin}</nNFFin>` +
    `<xJust>${xJust}</xJust>` +
    `</infInut>`;

  return { infInut, inutId };
}

// ─── SOAP Envelope ───
function wrapSoapEvento(body: string): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope" xmlns:nfe="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4">` +
    `<soap12:Body><nfe:nfeRecepcaoEvento><nfeDadosMsg>` +
    body +
    `</nfeDadosMsg></nfe:nfeRecepcaoEvento></soap12:Body></soap12:Envelope>`
  );
}

function wrapSoapInutilizacao(body: string): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope" xmlns:nfe="http://www.portalfiscal.inf.br/nfe/wsdl/NFeInutilizacao4">` +
    `<soap12:Body><nfe:nfeInutilizacaoNF><nfeDadosMsg>` +
    body +
    `</nfeDadosMsg></nfe:nfeInutilizacaoNF></soap12:Body></soap12:Envelope>`
  );
}

// ─── Send SOAP to SEFAZ (via proxy mTLS) ───
async function sendToSefaz(
  url: string,
  soapXml: string,
  certPem: string,
  keyPem: string
): Promise<string> {
  const proxyUrl = Deno.env.get("SEFAZ_PROXY_URL");

  if (proxyUrl) {
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

  // Fallback: tentativa direta
  console.warn("SEFAZ_PROXY_URL não configurada. Tentando conexão direta...");
  let response: Response;
  try {
    // @ts-ignore
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

// ─── Parse SOAP Response ───
function extractFromXml(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i");
  const match = xml.match(regex);
  return match?.[1] || "";
}

function parseEventoResponse(xml: string) {
  return {
    cStat: extractFromXml(xml, "cStat"),
    xMotivo: extractFromXml(xml, "xMotivo"),
    nProt: extractFromXml(xml, "nProt"),
    dhRegEvento: extractFromXml(xml, "dhRegEvento"),
  };
}

function parseInutilizacaoResponse(xml: string) {
  return {
    cStat: extractFromXml(xml, "cStat"),
    xMotivo: extractFromXml(xml, "xMotivo"),
    nProt: extractFromXml(xml, "nProt"),
    dhRecbto: extractFromXml(xml, "dhRecbto"),
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
      tipo,
      emitente_id,
      cert_senha,
      ambiente = "1", // Default: produção
      // Evento params
      chave_acesso,
      protocolo_autorizacao,
      justificativa,
      correcao,
      n_seq_evento = 1,
      // Inutilização params
      ano,
      serie,
      numero_inicial,
      numero_final,
    } = body;

    if (!tipo || !emitente_id || !cert_senha) {
      return new Response(
        JSON.stringify({ success: false, error: "Parâmetros obrigatórios: tipo, emitente_id, cert_senha" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get emitente data
    const { data: emitente, error: emError } = await supabase
      .from("emitentes")
      .select("*")
      .eq("id", emitente_id)
      .maybeSingle();

    if (emError || !emitente) {
      return new Response(
        JSON.stringify({ success: false, error: "Emitente não encontrado." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!emitente.cert_file_path) {
      return new Response(
        JSON.stringify({ success: false, error: "Certificado digital não configurado para este emitente." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download certificate from storage
    const { data: certFile, error: certError } = await supabase.storage
      .from("certificados")
      .download(emitente.cert_file_path);

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

    const cnpj = emitente.cpf_cnpj.replace(/\D/g, "");
    const urls = SEFAZ_URLS[ambiente];

    let soapXml: string;
    let sefazUrl: string;
    let parseResponse: (xml: string) => any;

    if (tipo === "cancelamento") {
      if (!chave_acesso || !protocolo_autorizacao || !justificativa) {
        return new Response(
          JSON.stringify({ success: false, error: "Cancelamento requer: chave_acesso, protocolo_autorizacao, justificativa" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const detEvento = buildCancelamentoDetEvento(protocolo_autorizacao, justificativa);
      const { infEvento, eventId } = buildEventoXml({
        tpAmb: ambiente,
        cnpj,
        chNFe: chave_acesso,
        tpEvento: "110111",
        nSeqEvento: n_seq_evento,
        detEvento,
      });

      const signature = signXml(infEvento, eventId, pfxData.key, pfxData.certDerBytes);

      const eventoXml =
        `<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">` +
        `<idLote>${Date.now()}</idLote>` +
        `<evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">` +
        infEvento +
        signature +
        `</evento></envEvento>`;

      soapXml = wrapSoapEvento(eventoXml);
      sefazUrl = urls.recepcaoEvento;
      parseResponse = parseEventoResponse;

    } else if (tipo === "carta_correcao") {
      if (!chave_acesso || !correcao) {
        return new Response(
          JSON.stringify({ success: false, error: "Carta de Correção requer: chave_acesso, correcao" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const detEvento = buildCartaCorrecaoDetEvento(correcao);
      const { infEvento, eventId } = buildEventoXml({
        tpAmb: ambiente,
        cnpj,
        chNFe: chave_acesso,
        tpEvento: "110110",
        nSeqEvento: n_seq_evento,
        detEvento,
      });

      const signature = signXml(infEvento, eventId, pfxData.key, pfxData.certDerBytes);

      const eventoXml =
        `<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">` +
        `<idLote>${Date.now()}</idLote>` +
        `<evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">` +
        infEvento +
        signature +
        `</evento></envEvento>`;

      soapXml = wrapSoapEvento(eventoXml);
      sefazUrl = urls.recepcaoEvento;
      parseResponse = parseEventoResponse;

    } else if (tipo === "inutilizacao") {
      if (!ano || !serie || !numero_inicial || !numero_final || !justificativa) {
        return new Response(
          JSON.stringify({ success: false, error: "Inutilização requer: ano, serie, numero_inicial, numero_final, justificativa" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { infInut, inutId } = buildInutilizacaoXml({
        tpAmb: ambiente,
        cnpj,
        ano,
        serie,
        nNFIni: numero_inicial,
        nNFFin: numero_final,
        xJust: justificativa,
      });

      const signature = signXml(infInut, inutId, pfxData.key, pfxData.certDerBytes);

      const inutXml =
        `<inutNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">` +
        infInut +
        signature +
        `</inutNFe>`;

      soapXml = wrapSoapInutilizacao(inutXml);
      sefazUrl = urls.inutilizacao;
      parseResponse = parseInutilizacaoResponse;

    } else {
      return new Response(
        JSON.stringify({ success: false, error: "Tipo inválido. Use: cancelamento, carta_correcao, inutilizacao" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`${tipo} preparado. SOAP XML length: ${soapXml.length}`);

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
          tipo,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Legacy mode: edge function transmits via proxy
    const responseXml = await sendToSefaz(sefazUrl, soapXml, pfxData.certPem, pfxData.keyPem);
    console.log("SEFAZ Response:", responseXml.substring(0, 500));

    const result = parseResponse(responseXml);

    const successCodes = ["128", "135", "102", "101", "573"];
    const isSuccess = successCodes.includes(result.cStat);

    return new Response(
      JSON.stringify({
        success: isSuccess,
        cStat: result.cStat,
        xMotivo: result.xMotivo,
        nProt: result.nProt || null,
        responseXml: responseXml.substring(0, 2000),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Erro no sefaz-evento:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
