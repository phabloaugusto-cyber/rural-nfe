/**
 * Transmissão de NF-e via proxy mTLS (VPS ou local).
 * 
 * O frontend chama edge functions que fazem relay para o proxy VPS,
 * eliminando problemas de mixed-content e localhost no celular.
 */

import { supabase } from "@/integrations/supabase/client";

interface ProxyPayload {
  sefaz_url: string;
  soap_xml: string;
  cert_pem: string;
  key_pem: string;
}

interface ProxyResponse {
  success: boolean;
  responseXml: string;
  error?: string;
}

/**
 * Verifica se o proxy SEFAZ está online (via edge function)
 */
export async function checkProxyHealth(): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke("proxy-health");
    if (error) return false;
    return data?.online ?? false;
  } catch {
    return false;
  }
}

/**
 * Envia SOAP XML assinado ao proxy para transmissão mTLS à SEFAZ (via edge function relay)
 */
export async function transmitViLocalProxy(payload: ProxyPayload): Promise<ProxyResponse> {
  const { data, error } = await supabase.functions.invoke("proxy-relay", {
    body: payload,
  });

  if (error) {
    throw new Error(error.message || "Erro ao chamar proxy-relay");
  }

  if (!data?.success) {
    throw new Error(data?.error || "Proxy retornou erro");
  }

  return data;
}

/**
 * Extrai valores de tags XML simples (com ou sem namespace)
 */
export function extractFromXml(xml: string, tag: string): string {
  const regexPlain = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i");
  const matchPlain = xml.match(regexPlain);
  if (matchPlain?.[1]) return matchPlain[1];

  const regexNs = new RegExp(`<[a-zA-Z0-9]+:${tag}[^>]*>([^<]*)</[a-zA-Z0-9]+:${tag}>`, "i");
  const matchNs = xml.match(regexNs);
  return matchNs?.[1] || "";
}

/**
 * Parse da resposta de autorização da SEFAZ
 */
export function parseAutorizacaoResponse(xml: string) {
  const protNFeMatch = xml.match(/<protNFe[\s\S]*?<\/protNFe>/i);
  const protNFeXml = protNFeMatch ? protNFeMatch[0] : "";
  const targetXml = protNFeXml || xml;

  return {
    cStat: extractFromXml(targetXml, "cStat"),
    xMotivo: extractFromXml(targetXml, "xMotivo"),
    nProt: extractFromXml(targetXml, "nProt"),
    dhRecbto: extractFromXml(targetXml, "dhRecbto"),
    chNFe: extractFromXml(targetXml, "chNFe"),
    cStatLote: extractFromXml(xml, "cStat"),
    xMotivoLote: extractFromXml(xml, "xMotivo"),
  };
}

/**
 * Parse da resposta de evento (cancelamento, CC-e, inutilização)
 */
export function parseEventoResponse(xml: string) {
  return {
    cStat: extractFromXml(xml, "cStat"),
    xMotivo: extractFromXml(xml, "xMotivo"),
    nProt: extractFromXml(xml, "nProt"),
    dhRegEvento: extractFromXml(xml, "dhRegEvento"),
  };
}
