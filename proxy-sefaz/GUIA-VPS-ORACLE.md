# Guia: Deploy do Proxy SEFAZ na Oracle Cloud Free Tier

## 1. Criar a VPS na Oracle Cloud

1. Acesse [cloud.oracle.com](https://cloud.oracle.com) e crie uma conta gratuita
2. Vá em **Compute → Instances → Create Instance**
3. Escolha:
   - **Image**: Ubuntu 22.04 (ou mais recente)
   - **Shape**: VM.Standard.A1.Flex (ARM - gratuito, até 4 vCPUs / 24GB RAM)
   - Use **1 vCPU e 6GB RAM** (mais que suficiente)
4. Baixe a chave SSH para acessar a VPS
5. Anote o **IP Público** da instância

## 2. Liberar a Porta no Firewall da Oracle

A Oracle bloqueia portas por padrão. É necessário liberar:

### No painel Oracle Cloud:
1. Vá em **Networking → Virtual Cloud Networks → sua VCN**
2. Clique na **subnet** → **Security Lists → Default Security List**
3. **Add Ingress Rule**:
   - Source CIDR: `0.0.0.0/0`
   - Destination Port: `3001`
   - Protocol: TCP
4. Salve

### No Ubuntu (firewall interno):
```bash
sudo iptables -I INPUT -p tcp --dport 3001 -j ACCEPT
sudo netfilter-persistent save
```

## 3. Instalar Node.js na VPS

```bash
# Conectar via SSH
ssh -i sua_chave.key ubuntu@SEU_IP_PUBLICO

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar
node --version
npm --version
```

## 4. Copiar e Configurar o Proxy

```bash
# Criar pasta do projeto
mkdir ~/proxy-sefaz
cd ~/proxy-sefaz

# Criar package.json
cat > package.json << 'EOF'
{
  "name": "proxy-sefaz",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.21.2"
  }
}
EOF

# Instalar dependências
npm install
```

Agora copie o arquivo `server.js` da pasta `proxy-sefaz/` do projeto para `~/proxy-sefaz/server.js` na VPS.

Você pode fazer isso via SCP:
```bash
# Do seu PC (na pasta do projeto):
scp -i sua_chave.key proxy-sefaz/server.js ubuntu@SEU_IP_PUBLICO:~/proxy-sefaz/
```

## 5. Configurar Token de Segurança

Crie um token secreto forte:
```bash
# Gerar token aleatório
export PROXY_SECRET=$(openssl rand -hex 32)
echo "Seu token: $PROXY_SECRET"
# ANOTE ESTE TOKEN! Você vai precisar dele no passo 7.
```

## 6. Rodar como Serviço (systemd)

Para o proxy iniciar automaticamente e continuar rodando:

```bash
sudo tee /etc/systemd/system/proxy-sefaz.service << EOF
[Unit]
Description=Proxy SEFAZ mTLS
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/proxy-sefaz
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
Environment=PORT=3001
Environment=PROXY_SECRET=SEU_TOKEN_AQUI

[Install]
WantedBy=multi-user.target
EOF

# Substituir o token (use o token gerado no passo 5)
sudo nano /etc/systemd/system/proxy-sefaz.service

# Ativar e iniciar
sudo systemctl daemon-reload
sudo systemctl enable proxy-sefaz
sudo systemctl start proxy-sefaz

# Verificar status
sudo systemctl status proxy-sefaz
```

### Comandos úteis:
```bash
# Ver logs em tempo real
sudo journalctl -u proxy-sefaz -f

# Reiniciar
sudo systemctl restart proxy-sefaz

# Parar
sudo systemctl stop proxy-sefaz
```

## 7. Atualizar as Variáveis no Sistema

No Lovable, atualize os secrets:

- **SEFAZ_PROXY_URL**: `http://SEU_IP_PUBLICO:3001/proxy`
- **SEFAZ_PROXY_SECRET**: O token gerado no passo 5

## 8. Testar

```bash
# Do seu PC ou celular, teste o health check:
curl http://SEU_IP_PUBLICO:3001/health

# Deve retornar: {"status":"ok","timestamp":"..."}
```

Se funcionar, a transmissão de NF-e já vai funcionar do celular! 🎉

## Dicas

- **Manter local também**: No PC, você pode continuar usando `localhost:3001` sem problemas
- **Atualizar proxy**: Sempre que editar o `server.js`, copie para a VPS e rode `sudo systemctl restart proxy-sefaz`
- **Segurança**: O token `PROXY_SECRET` protege contra acesso não autorizado
- **Monitorar**: Use `sudo journalctl -u proxy-sefaz -f` para ver logs em tempo real
- **Oracle Free Tier**: A VPS é gratuita para sempre (Always Free), não expira!
