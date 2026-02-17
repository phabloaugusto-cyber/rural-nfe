import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const proxyUrl = Deno.env.get("SEFAZ_PROXY_URL");
  if (!proxyUrl) {
    return new Response(JSON.stringify({ online: false, reason: "URL não configurada" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const healthUrl = proxyUrl.replace(/\/proxy$/, "/health");
    const res = await fetch(healthUrl, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    return new Response(JSON.stringify({ online: res.ok, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ online: false, reason: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
