/**
 * Proxy mTLS para SEFAZ-GO
 * 
 * Este microserviço recebe o XML SOAP já assinado da edge function
 * e o encaminha à SEFAZ usando mTLS (certificado de cliente).
 * 
 * Uso:
 *   1. npm install
 *   2. node server.js
 * 
 * Variáveis de ambiente:
 *   PORT           - Porta do servidor (padrão: 3001)
 *   PROXY_SECRET   - Token de autenticação (obrigatório em produção)
 * 
 * O certificado PFX é enviado junto na requisição (base64),
 * então NÃO é necessário ter o .pfx no servidor proxy.
 */

const express = require("express");
const cors = require("cors");
const https = require("https");
const { URL } = require("url");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 3001;
const PROXY_SECRET = process.env.PROXY_SECRET || "";

// Auth middleware
function authMiddleware(req, res, next) {
  if (PROXY_SECRET) {
    const token = req.headers["x-proxy-token"];
    if (token !== PROXY_SECRET) {
      return res.status(401).json({ error: "Token inválido" });
    }
  }
  next();
}

/**
 * POST /proxy
 * Body: {
 *   sefaz_url: string,     // URL da SEFAZ (ex: https://nfe.sefaz.go.gov.br/...)
 *   soap_xml: string,      // XML SOAP completo já assinado
 *   cert_pem: string,      // Certificado PEM (client cert)
 *   key_pem: string,       // Chave privada PEM
 * }
 */
app.post("/proxy", authMiddleware, async (req, res) => {
  const { sefaz_url, soap_xml, cert_pem, key_pem } = req.body;

  if (!sefaz_url || !soap_xml || !cert_pem || !key_pem) {
    return res.status(400).json({
      error: "Campos obrigatórios: sefaz_url, soap_xml, cert_pem, key_pem",
    });
  }

  console.log(`[${new Date().toISOString()}] Proxy -> ${sefaz_url}`);
  console.log(`  SOAP XML length: ${soap_xml.length}`);

  try {
    const parsedUrl = new URL(sefaz_url);

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: "POST",
      cert: cert_pem,
      key: key_pem,
      headers: {
        "Content-Type": "application/soap+xml; charset=utf-8",
        "Content-Length": Buffer.byteLength(soap_xml, "utf-8"),
      },
      // Accept gov certs (ICP-Brasil) not in default CA store
      rejectUnauthorized: false,
      // Timeout 30s
      timeout: 30000,
    };

    const responseXml = await new Promise((resolve, reject) => {
      const request = https.request(options, (response) => {
        let data = "";
        response.on("data", (chunk) => (data += chunk));
        response.on("end", () => resolve(data));
      });

      request.on("error", (err) => reject(err));
      request.on("timeout", () => {
        request.destroy();
        reject(new Error("Timeout na conexão com SEFAZ (30s)"));
      });

      request.write(soap_xml);
      request.end();
    });

    console.log(`  Response length: ${responseXml.length}`);
    console.log(`  Response preview: ${responseXml.substring(0, 300)}`);

    return res.json({ success: true, responseXml });
  } catch (err) {
    console.error(`  Erro: ${err.message}`);
    return res.status(502).json({
      error: `Erro na comunicação com SEFAZ: ${err.message}`,
    });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Listen on all interfaces (0.0.0.0) for VPS compatibility
app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🔒 Proxy SEFAZ mTLS rodando na porta ${PORT}`);
  console.log(`   Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`   Endpoint:     http://0.0.0.0:${PORT}/proxy`);
  if (PROXY_SECRET) {
    console.log(`   Auth:         Token configurado ✅`);
  } else {
    console.log(`   Auth:         ⚠️  Sem token (defina PROXY_SECRET para produção)`);
  }
  console.log();
});
