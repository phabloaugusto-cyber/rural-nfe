#!/bin/bash
# Setup completo do Proxy SEFAZ na VPS
echo "=== Instalando Node.js ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "=== Criando projeto ==="
mkdir -p ~/proxy-sefaz
cd ~/proxy-sefaz

cat > package.json << 'EOF'
{
  "name": "proxy-sefaz",
  "version": "1.0.0",
  "scripts": { "start": "node server.js" },
  "dependencies": { "cors": "^2.8.5", "express": "^4.21.2" }
}
EOF

npm install

cat > server.js << 'SERVEREOF'
const express = require("express");
const cors = require("cors");
const https = require("https");
const { URL } = require("url");
const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
const PORT = process.env.PORT || 3001;
const PROXY_SECRET = process.env.PROXY_SECRET || "";
function authMiddleware(req, res, next) {
  if (PROXY_SECRET) {
    const token = req.headers["x-proxy-token"];
    if (token !== PROXY_SECRET) return res.status(401).json({ error: "Token invalido" });
  }
  next();
}
app.post("/proxy", authMiddleware, async (req, res) => {
  const { sefaz_url, soap_xml, cert_pem, key_pem } = req.body;
  if (!sefaz_url || !soap_xml || !cert_pem || !key_pem) return res.status(400).json({ error: "Campos obrigatorios" });
  console.log("[" + new Date().toISOString() + "] Proxy -> " + sefaz_url);
  try {
    const parsedUrl = new URL(sefaz_url);
    const options = { hostname: parsedUrl.hostname, port: parsedUrl.port || 443, path: parsedUrl.pathname + parsedUrl.search, method: "POST", cert: cert_pem, key: key_pem, headers: { "Content-Type": "application/soap+xml; charset=utf-8", "Content-Length": Buffer.byteLength(soap_xml, "utf-8") }, rejectUnauthorized: false, timeout: 30000 };
    const responseXml = await new Promise((resolve, reject) => {
      const request = https.request(options, (response) => { let data = ""; response.on("data", (chunk) => (data += chunk)); response.on("end", () => resolve(data)); });
      request.on("error", (err) => reject(err));
      request.on("timeout", () => { request.destroy(); reject(new Error("Timeout 30s")); });
      request.write(soap_xml);
      request.end();
    });
    return res.json({ success: true, responseXml });
  } catch (err) { return res.status(502).json({ error: "Erro SEFAZ: " + err.message }); }
});
app.get("/health", (req, res) => { res.json({ status: "ok", timestamp: new Date().toISOString() }); });
app.listen(PORT, "0.0.0.0", () => { console.log("Proxy SEFAZ rodando na porta " + PORT); });
SERVEREOF

echo "=== Gerando token de seguranca ==="
MEUTOKEN=$(openssl rand -hex 32)
echo ""
echo "=========================================="
echo "  SEU TOKEN: $MEUTOKEN"
echo "  ANOTE ESTE TOKEN!!!"
echo "=========================================="
echo ""

echo "=== Criando servico systemd ==="
sudo tee /etc/systemd/system/proxy-sefaz.service << EOF
[Unit]
Description=Proxy SEFAZ mTLS
After=network.target
[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME/proxy-sefaz
ExecStart=/usr/bin/node server.js
Restart=always
Environment=PORT=3001
Environment=PROXY_SECRET=$MEUTOKEN
[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable proxy-sefaz
sudo systemctl start proxy-sefaz

echo "=== Liberando firewall ==="
sudo iptables -I INPUT -p tcp --dport 3001 -j ACCEPT

echo ""
echo "=========================================="
echo "  TUDO PRONTO!"
echo "  TOKEN: $MEUTOKEN"
echo "=========================================="
