import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const proxyUrl = Deno.env.get("SEFAZ_PROXY_URL");
  const proxySecret = Deno.env.get("SEFAZ_PROXY_SECRET");

  if (!proxyUrl) {
    return new Response(JSON.stringify({ error: "SEFAZ_PROXY_URL não configurada" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { sefaz_url, soap_xml, cert_pem, key_pem } = body;

    if (!sefaz_url || !soap_xml || !cert_pem || !key_pem) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: sefaz_url, soap_xml, cert_pem, key_pem" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (proxySecret) {
      headers["x-proxy-token"] = proxySecret;
    }

    const res = await fetch(proxyUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ sefaz_url, soap_xml, cert_pem, key_pem }),
    });

    const result = await res.json();

    return new Response(JSON.stringify(result), {
      status: res.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: `Erro no relay: ${err.message}` }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
